/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/authorization");
const db = require("../config/db");
const mailer = require("../controller/mailController");

const sharp = require("sharp");
const AWS = require("aws-sdk");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// Configura multer (memoria)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "10mb" })); // Permitir imágenes grandes en base64

const admin = require('firebase-admin');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Función para subir desde buffer a S3
const uploadToS3 = async (file) => {
  // Redimensionar imagen
  const resizedBuffer = await sharp(file.buffer)
    .resize({ width: 800, height: 800, fit: "inside" }) // Mantiene proporción, máximo 800x800
    .toFormat("jpeg") // O "png" si prefieres
    .jpeg({ quality: 80 }) // Calidad al 80%
    .toBuffer();

  const key = `imagenes/${uuidv4()}.jpeg`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: resizedBuffer,
    ContentType: "image/jpeg"
  };

  return s3.upload(params).promise(); // { Location: ..., Key: ... }
};



app.get("/usuarios", async (req, res) => {
  try {
    let query = `SELECT 
		id_usuario,
		nombre_usur,
		correo_usur,
		tel_usur,
		ciudad_usur,
		forma_usur,
		acumulado_usur,
		aviso_usur,
		term_usur,
		tipo_usur
        FROM usuarios
        `;
    let usuarios = await db.pool.query(query);
    usuarios = usuarios[0];

    res.status(200).json({ error: false, usuarios });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

// CREAR UN USUARIO JWT
app.post("/crear", async (req, res) => {
  try {
    let {
      nombre_usur,
      correo_usur,
      tel_usur,
      ciudad_usur,
      forma_usur,
      pass,
      tipo_usur,
      id_sucursal,
    } = req.body; // OBTENER USUARIO, EMAIL Y PASSWORD DE LA PETICIÓN

    let errors = Array();

    if (!nombre_usur) {
      errors.push({ msg: "El campo nombre debe de contener un valor" });
    }
    if (!correo_usur) {
      errors.push({ msg: "El campo correo debe de contener un valor" });
    }
    if (!tel_usur) {
      errors.push({ msg: "El campo teléfono debe de contener un valor" });
    }
    if (!pass) {
      errors.push({ msg: "El campo password debe de contener un valor" });
    }
    if (!tipo_usur) {
      errors.push({
        msg: "El campo tipo de usuario debe de contener un valor",
      });
    }
    if (!id_sucursal) {
      errors.push({
        msg: "El campo id sucursal debe de contener un valor",
      });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parámetros",
        error: true,
        details: errors,
      });
    }

    //Verificamos no exista el correo en la DB
    let query = `SELECT * FROM usuarios WHERE correo_usur = '${correo_usur}'`;
    let existCorreo = await db.pool.query(query);

    if (existCorreo[0].length >= 1) {
      return res.status(400).json({
        msg: "El correo ya está registrado",
        error: true,
      });
    }

    //Verificamos no exista el telefono en la DB
    let query2 = `SELECT * FROM usuarios WHERE tel_usur = '${tel_usur}'`;
    let existTelefono = await db.pool.query(query2);

    if (existTelefono[0].length >= 1) {
      return res.status(400).json({
        msg: "El teléfono ya está registrado",
        error: true,
      });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(pass, salt);

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;

    query = `INSERT INTO usuarios 
	   (nombre_usur,
      correo_usur,
      tel_usur,
      ciudad_usur,
      forma_usur,
      pass,
      tipo_usur,
      estatus_usur,
      id_sucursal,
	    created_at,
	    updated_at) 
	    VALUES 
	    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      nombre_usur,
      correo_usur,
      tel_usur,
      ciudad_usur,
      forma_usur,
      hashedPassword,
      tipo_usur,
      "registrado",
      id_sucursal,
      fecha,
      fecha,
    ];

    let result = await db.pool.query(query, values);
    result = result[0];

    //CREAR TRIVIAS
    // Obtener todas las preguntas necesarias antes de insertarlas
    const [preguntasGenerales] = await db.pool.query(
      "SELECT id_pregunta FROM preguntas ORDER BY RAND() LIMIT 100"
    );
    const [preguntasMax] = await db.pool.query(
      "SELECT id_pregunta_max FROM preguntas_max ORDER BY RAND() LIMIT 50"
    );

    if (preguntasGenerales.length < 100 || preguntasMax.length < 50) {
      throw new Error("No hay suficientes preguntas en la base de datos.");
    }

    const query3 =
      "INSERT INTO conjunto_triv (id_user_conj, id_preg1_conj, id_preg2_conj, id_preg3_conj, num_trivia, estatus_conj) VALUES (?, ?, ?, ?, ?, ?)";

    // Insertar 50 trivias asegurando que cada una tiene preguntas únicas
    for (let i = 0; i < 50; i++) {
      const pregunta_1 = preguntasGenerales.shift().id_pregunta;
      const pregunta_2 = preguntasGenerales.shift().id_pregunta;
      const pregunta_3 = preguntasMax.shift().id_pregunta_max;
      await db.pool.query(query3, [
        result.insertId,
        pregunta_1,
        pregunta_2,
        pregunta_3,
        i + 1,
        "creada",
      ]);
    }

    //crear token
    const payload = {
      user: {
        id: result.insertId,
        correo: correo_usur,
      },
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "60d" });

    //enviamos correo para que confirme su cuenta
    let message = {
      from: process.env.MAIL, // sender address
      to: correo_usur, // list of receivers
      subject: "Confirma tu cuenta", // Subject line
      text: "", // plain text body
      html: `<p>Haz click en el enlace para confirmar tu cuenta</p><a href="http://maxaniversario.com/verified.html?token=${token}">Confirma tu cuenta</a>`,
    };
    const info = await mailer.sendMail(message);
    console.log(info);

    res.status(200).json({ error: false, msg: "Usuario creado exitosamente" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: true,
      msg: error.response,
    });
  }
});

// INICIAR SESIÓN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let errors = Array();

    if (!email) {
      errors.push({ msg: "El campo email debe de contener un valor" });
    }
    if (!password) {
      errors.push({ msg: "El campo password debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let query = `SELECT * FROM usuarios WHERE correo_usur = '${email}'`;

    let user = await db.pool.query(query);

    user = user[0];

    if (user.length === 0) {
      return res.status(400).json({ error: true, msg: "El usuario no existe" });
    }

    user = user[0];

    const passCorrecto = await bcryptjs.compare(password, user.pass);

    if (!passCorrecto) {
      return res.status(400).json({ error: true, msg: "Password incorrecto" });
    }

    if (user.estatus_usur == 'cancelado') {
      return res.status(400).json({ error: true, msg: `Lo sentimos, el correo ${email} fué dado de baja.` });
    }

    if (user.tipo_usur == "Administrador") {
      return res.status(400).json({ error: true, msg: "Lo sentimos, necesitas ser cliente o colaborador para tener acceso." });
    }

    const payload = {
      user: {
        id: user.id_usuario,
        nombre: user.nombre_usur,
        correo: user.correo_usur,
        acumulado: user.acumulado_usur,
        ranking: user.ranking_usur,
        estatus: user.estatus_usur,
      },
    };

    let goToUrl = "";
    if (user.tipo_usur == "Cliente") {
      goToUrl = "inicio.html";
    } else if (user.tipo_usur == "Colaborador") {

      //vemos si en base a las fechas de vigencia del concurso el usuario se puede loguear
      const [rows] = await db.pool.query("SELECT fecha_inicio, fecha_fin FROM vigencia LIMIT 1");

      if (rows.length === 0) {
        return res.status(400).json({ error: true, msg: "No se encontró información de vigencia en la base de datos" });
      } else {

        //vemos si entra en los parametros del concurso
        const { fecha_inicio, fecha_fin } = rows[0];
        const fechaActual = new Date();
        const soloFecha = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

        const inicio = soloFecha(new Date(fecha_inicio));
        const fin = soloFecha(new Date(fecha_fin));
        const actual = soloFecha(fechaActual);

        if (actual < inicio || actual > fin) {
          return res.status(400).json({ error: true, msg: "La fecha actual no está dentro del periodo permitido" });
        }
      }

      goToUrl = "upload_ticket.html";

    }

    //firma del jwt  3600000 = 1hora
    if (email && passCorrecto) {
      jwt.sign(
        payload,
        process.env.SECRET,
        { expiresIn: 3600000 },
        (error, token) => {
          if (error) throw error;

          if (goToUrl == '') {
            res.json({ error: true, msg: "Lo sentimos, necesitas ser cliente o colaborador para tener acceso." });
          } else {
            res.status(200).json({ error: false, token: token, goToUrl });
          }
        }
      );
    } else {
      res.json({ error: true, msg: "Hubo un error" });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: true, msg: "Hubo un error", error });
  }
});

app.post("/loginAdmin", async (req, res) => {
  try {
    const { email, password } = req.body;

    let errors = Array();

    if (!email) {
      errors.push({ msg: "El campo email debe de contener un valor" });
    }
    if (!password) {
      errors.push({ msg: "El campo password debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let query = `SELECT * FROM usuarios WHERE correo_usur = '${email}' AND estatus_usur != 'cancelado'`;

    let user = await db.pool.query(query);

    user = user[0];

    if (user.length === 0) {
      return res.status(400).json({ error: true, msg: "El usuario no existe" });
    }

    user = user[0];

    const passCorrecto = await bcryptjs.compare(password, user.pass);

    if (!passCorrecto) {
      return res.status(400).json({ error: true, msg: "Password incorrecto" });
    }

    if (user.tipo_usur == "Cliente" || user.tipo_usur == "Colaborador") {
      return res.status(400).json({ error: true, msg: "Lo sentimos no eres administrador" });
    }

    const payload = {
      user: {
        id: user.id_usuario,
        nombre: user.nombre_usur,
        correo: user.correo_usur,
        estatus: user.estatus_usur,
      },
    };

    //firma del jwt  3600000 = 1hora
    if (email && passCorrecto) {
      jwt.sign(
        payload,
        process.env.SECRET,
        { expiresIn: 3600000 },
        (error, token) => {
          if (error) throw error;
          res.status(200).json({ error: false, token: token });
        }
      );
    } else {
      res.json({ error: true, msg: "Hubo un error" });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: true, msg: "Hubo un error", error });
  }
});

app.post("/desactivar", async (req, res) => {
  try {

    const { userId } = req.body;

    let errors = Array();

    if (!userId) {
      errors.push({ msg: "El campo id usuario debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;

    query = `UPDATE usuarios SET
						estatus_usur = 'cancelado', 
						updated_at  = '${fecha}'
	  				WHERE id_usuario = ${userId}`;


    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "El usuario ha sido dado de baja" });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
    });
  }
});

app.post("/resetpass", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        msg: "No se recibió el correo",
        error: true,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;

    let query = `SELECT * FROM usuarios WHERE correo_usur ='${email}'`;

    let user = await db.pool.query(query);

    user = user[0];

    if (user.length === 0) {
      return res.status(400).json({ error: true, msg: "El usuario no existe" });
    }

    user = user[0];

    if (user.estatus_usur == 'cancelado') {
      return res.status(400).json({ error: true, msg: `Lo sentimos, el correo ${email} fué dado de baja.` });
    }

    let newpass = Math.random().toString(36).substring(0, 10);

    let message = {
      from: process.env.MAIL, // sender address
      to: email, // list of receivers
      subject: "Cambio de Contraseña", // Subject line
      text: "", // plain text body
      html: `<p>Su nueva contraseña es: ${newpass}</p>`, // html body
    };

    const info = await mailer.sendMail(message);
    console.log(info);

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newpass, salt);

    user = user[0];

    query = `UPDATE usuarios  SET
						pass    = '${hashedPassword}', 
						updated_at  = '${fecha}'
						WHERE id_usuario  = ${user.id_usuario}`;

    let result = await db.pool.query(query);

    res
      .status(200)
      .json({ error: false, msg: "Se ha enviado el correo electronico" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/obtener/:id", async (req, res) => {
  try {
    let userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        msg: "El id debe de tener algun valor",
        error: true,
      });
    }

    let query = `SELECT id_usuario, nombre_usur, correo_usur, tel_usur, ciudad_usur, forma_usur, acumulado_usur, aviso_usur, term_usur, tipo_usur, estatus_usur  
						FROM usuarios 
						WHERE id_usuario = ${userId}`;

    let user = await db.pool.query(query);
    //console.log(user[0]);
    user = user[0];

    res.status(200).json({ error: false, user });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

// VERIFICAR TOKEN
app.post("/verificar", auth, async (req, res) => {
  try {
    // Extraemos el ID del usuario desde el token
    const userId = req.user.id;

    // Consultamos la base de datos para obtener los datos del usuario (excluyendo la contraseña)
    const [rows] = await db.pool.query(
      "SELECT id_usuario, nombre_usur, correo_usur, tel_usur, ciudad_usur, acumulado_usur, tipo_usur, estatus_usur, ranking_usur, id_sucursal, nombreSucursal, firebase_token FROM usuarios LEFT JOIN sucursales ON sucursales.idSucursal = usuarios.id_sucursal WHERE id_usuario = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Usuario no encontrado" });
    }

    const user = rows[0];

    if (user.tipo_usur == "Colaborador") {

      //vemos si en base a las fechas de vigencia del concurso el usuario se puede loguear
      const [rows] = await db.pool.query("SELECT fecha_inicio, fecha_fin FROM vigencia LIMIT 1");

      if (rows.length === 0) {
        return res.status(400).json({ error: true, msg: "No se encontró información de vigencia en la base de datos" });
      } else {

        //vemos si entra en los parametros del concurso
        const { fecha_inicio, fecha_fin } = rows[0];
        const fechaActual = new Date();
        const soloFecha = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

        const inicio = soloFecha(new Date(fecha_inicio));
        const fin = soloFecha(new Date(fecha_fin));
        const actual = soloFecha(fechaActual);

        if (actual < inicio || actual > fin) {
          return res.status(400).json({ error: true, msg: "La fecha actual no está dentro del periodo permitido" });
        }
      }

    }

    // Devolvemos los datos del usuario
    res.status(200).json({ error: false, user: user });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
    });
  }
});

// VERIFICAR CUENTA DE CORREO
app.post("/verifyAccount", auth, async (req, res) => {
  const { id, correo } = req.user; // El id y email del usuario que está en el token

  try {
    // Buscar el usuario
    const selectQuery = `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND correo_usur = ?`;
    const [rows] = await db.pool.query(selectQuery, [id, correo]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Usuario no encontrado" });
    }

    // Si el usuario existe, actualizar el estatus a 'confirmado'
    const updateQuery = `UPDATE usuarios SET estatus_usur = 'confirmado' WHERE id_usuario = ?`;
    await db.pool.query(updateQuery, [id]);

    res
      .status(200)
      .json({ error: false, msg: "Cuenta confirmada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, msg: "Error en el servidor" });
  }
});

app.put("/set", async (req, res) => {
  try {
    let {
      id,
      nombre_usur,
      correo_usur,
      tel_usur,
      ciudad_usur,
      forma_usur,
      pass,
      tipo_usur,
    } = req.body;

    let errors = Array();

    if (!id) {
      errors.push({ msg: "El campo id debe de contener un valor valido" });
    }
    if (!nombre_usur) {
      errors.push({ msg: "El campo nombre debe de contener un valor" });
    }
    if (!correo_usur) {
      errors.push({ msg: "El campo correo debe de contener un valor" });
    }
    if (!tel_usur) {
      errors.push({ msg: "El campo teléfono debe de contener un valor" });
    }
    if (!tipo_usur) {
      errors.push({
        msg: "El campo tipo de usuario debe de contener un valor",
      });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;

    if (pass) {
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(pass, salt);

      query = `UPDATE usuario  SET
	  					nombre_usur = '${nombre_usur}', 
      					correo_usur = '${correo_usur}', 
      					tel_usur    = '${tel_usur}', 
      					ciudad_usur = '${ciudad_usur}', 
      					forma_usur  = '${forma_usur}', 
      					pass        = '${hashedPassword}', 
      					tipo_usur   = '${tipo_usur}'
                        updated_at  = '${fecha}'
                        WHERE id_usuario = ${id}`;
    } else {
      query = `UPDATE usuario  SET
						nombre_usur = '${nombre_usur}', 
						correo_usur = '${correo_usur}', 
						tel_usur    = '${tel_usur}', 
						ciudad_usur = '${ciudad_usur}', 
						forma_usur  = '${forma_usur}', 
						tipo_usur   = '${tipo_usur}'
	  					updated_at  = '${fecha}'
	  					WHERE id_usuario = ${id}`;
    }

    let result = await db.pool.query(query);
    result = result[0];

    const payload = {
      cliente: {
        id: result.insertId,
      },
    };

    res
      .status(200)
      .json({ error: false, msg: "Registro actualizado con exito" });
  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.put("/setName", async (req, res) => {
  try {
    let {
      id,
      nombre_usur
    } = req.body;

    let errors = Array();

    if (!id) {
      errors.push({ msg: "El campo id debe de contener un valor valido" });
    }
    if (!nombre_usur) {
      errors.push({ msg: "El campo nombre debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;

    query = `UPDATE usuarios SET
						nombre_usur = '${nombre_usur}', 
						updated_at  = '${fecha}'
	  				WHERE id_usuario = ${id}`;


    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "Registro actualizado con exito" });
  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.put("/setPhone", async (req, res) => {
  try {
    let {
      id,
      tel_usur
    } = req.body;

    let errors = Array();

    if (!id) {
      errors.push({ msg: "El campo id debe de contener un valor valido" });
    }
    if (!tel_usur) {
      errors.push({ msg: "El campo teléfono debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    //Verificamos no exista el telefono en la DB
    let query2 = `SELECT * FROM usuarios WHERE tel_usur = '${tel_usur}' AND id_usuario != '${id}'`;
    let existTelefono = await db.pool.query(query2);

    if (existTelefono[0].length >= 1) {
      return res.status(400).json({
        msg: "El teléfono ya está registrado",
        error: true,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;


    query = `UPDATE usuarios  SET
						tel_usur    = '${tel_usur}', 
	  				updated_at  = '${fecha}'
	  				WHERE id_usuario = ${id}`;

    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "Registro actualizado con exito" });

  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.put("/setPass", async (req, res) => {
  try {
    let {
      id,
      oldpass,
      pass
    } = req.body;

    let errors = Array();

    if (!id) {
      errors.push({ msg: "El campo id debe de contener un valor valido" });
    }
    if (!oldpass) {
      errors.push({ msg: "El campo oldpass debe de contener un valor" });
    }
    if (!pass) {
      errors.push({ msg: "El campo oldpass debe de contener un valor" });
    }


    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let query2 = `SELECT * FROM usuarios WHERE id_usuario = '${id}'`;
    let user = await db.pool.query(query2);
    user = user[0];

    if (user.length === 0) {
      return res.status(400).json({ error: true, msg: "El usuario no existe" });
    }
    user = user[0];

    const passCorrecto = await bcryptjs.compare(oldpass, user.pass);

    if (!passCorrecto) {
      return res.status(400).json({ error: true, msg: "Contraseña incorrecta" });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;


    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(pass, salt);

    query = `UPDATE usuarios  SET
	    			 pass        = '${hashedPassword}', 
             updated_at  = '${fecha}'
             WHERE id_usuario = ${id}`;


    let result = await db.pool.query(query);
    result = result[0];


    res
      .status(200)
      .json({ error: false, msg: "Registro actualizado con exito" });
  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.put("/setCity", async (req, res) => {
  try {
    let {
      id,
      ciudad_usur
    } = req.body;

    let errors = Array();

    if (!id) {
      errors.push({ msg: "El campo id debe de contener un valor valido" });
    }
    if (!ciudad_usur) {
      errors.push({ msg: "El campo ciudad debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;

    query = `UPDATE usuarios  SET
						ciudad_usur    = '${ciudad_usur}', 
	  				updated_at  = '${fecha}'
	  				WHERE id_usuario = ${id}`;

    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "Registro actualizado con exito" });

  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.put("/delete", async (req, res) => {
  try {
    let userId = req.body.id;

    if (!userId) {
      return res.status(400).json({
        msg: "El id debe ser un numero entero",
        error: true,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;

    let query = `UPDATE usuarios  SET
                        estatus     = 'cancelado',
                        updated_at  = '${fecha}'
                        WHERE id_usuario = ${userId}`;

    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "Se ha dado de baja al usuario con éxito" });
  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }
});

app.post("/registrarTicket", upload.single("fotoTicket"), async (req, res) => {

  let firebase_token = null;
  let ultima_trivia = 0;
  let trivia_nueva = 0;

  let correoUsur = null;
  let idCompra = null;

  const {
    numeroNota,
    idUnidad,
    cantidadPrendas,
    total,
    fechaCompra,
    idCliente,
    idVendedor,
  } = req.body;

  // Validaciones básicas
  if (
    !numeroNota ||
    !idUnidad ||
    !cantidadPrendas ||
    !total ||
    !fechaCompra ||
    !req.file
  ) {
    return res
      .status(400)
      .json({ error: true, msg: "Faltan datos requeridos" });
  }

  try {

    //vemos si existe el id del cliente
    let selectQuery = `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND tipo_usur = "Cliente"`;
    let [rows] = await db.pool.query(selectQuery, [idCliente]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Cliente no encontrado" });
    }

    //vemos si existe el id del colaborador
    selectQuery = `SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND tipo_usur = "Colaborador"`;
    [rows] = await db.pool.query(selectQuery, [idVendedor]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Colaborador no encontrado" });
    }

    //vemos si existe el id del sucursal
    selectQuery = `SELECT idSucursal FROM sucursales WHERE idSucursal = ?`;
    [rows] = await db.pool.query(selectQuery, [idUnidad]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Sucursal no encontrada" });
    }

    //vemos si existe el id de compra de esa sucursal
    selectQuery = `SELECT id_compra FROM compras WHERE id_unidad_comp = ? AND nota_comp = ?`;
    [rows] = await db.pool.query(selectQuery, [idUnidad, numeroNota]);
    if (rows.length > 0) {
      return res
        .status(404)
        .json({ error: true, msg: "La nota ya fue registrada" });
    }


    //vemos si existe el id de sucursal corresponde al cliente si existe traemos el token de firebase
    selectQuery = `SELECT id_usuario, firebase_token, correo_usur FROM usuarios WHERE id_usuario = ? AND id_sucursal = ?`;
    [rows] = await db.pool.query(selectQuery, [idCliente, idUnidad]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "La sucursal seleccionada no le corresponde al Cliente" });
    }

    firebase_token = rows[0].firebase_token;
    console.log("FB token" + firebase_token);
    correoUsur = rows[0].correo_usur;

    // Subir imagen a AWS
    const uploadResult = await uploadToS3(req.file);
    const imageUrl = uploadResult.Location;

    let trivia = 0;
    let puntos = 0;

    if (total >= 80 && total <= 239) {
      trivia = 1;
      puntos = 1;
    } else if (total >= 240 && total <= 399) {
      trivia = 2;
      puntos = 3;
    } else if (total >= 400) {
      trivia = 3;
      puntos = 5;
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;

    // Insertar en la base de datos
    const query = `INSERT INTO compras (
      nota_comp,
      id_unidad_comp,
      prendas_comp,
      monto_comp,
      fecha_comp,
      id_usuario_comp,
      foto_comp,
      fecha_reg_comp,
      cat_trivia_comp,
      id_usuario_vend_comp
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      numeroNota,
      idUnidad,
      cantidadPrendas,
      total,
      fechaCompra,
      idCliente,
      imageUrl,
      fecha,
      trivia,
      idVendedor,
    ];

    let result = await db.pool.query(query, values);
    result = result[0];

    idCompra = result.insertId;

    //solo agrega trivia si puntos > 0
    if (puntos > 0) {
      //buscamos la ultima trivia del usuario
      const [rows] = await db.pool.query(
        `SELECT num_trivia FROM conjunto_triv WHERE id_user_conj = ? AND (estatus_conj = 'asignada' OR estatus_conj = 'contestada') ORDER BY num_trivia DESC LIMIT 1`,
        [idCliente]
      );

      if (rows.length > 0) {
        ultima_trivia = rows[0].num_trivia;
      }

      trivia_nueva = Number(ultima_trivia) + 1;

      if (trivia_nueva <= 50) {

        //UPDATE
        const query2 = `UPDATE conjunto_triv SET 
                    id_comp_conj = ?, 
                    id_unid_conj = ?, 
                    cat_conj = ?, 
                    estatus_conj = ?
                WHERE num_trivia = ? AND id_user_conj = ?`;

        const values2 = [
          idCompra,
          idUnidad,
          puntos,
          "asignada",
          trivia_nueva,
          idCliente
        ];

        let result2 = await db.pool.query(query2, values2);
      }

    }

  } catch (error) {
    console.error("Error guardando datos:", error);
    res
      .status(500)
      .json({ error: true, msg: "Error guardando datos" });
  }


  /////////////////////////////////////////////////////////////////////////// notificaciones   ///////////////////////////////////////////////////////////////

  //enviamos correo de notificacion
  try {

    let message = {};
    if (trivia_nueva <= 50) {
      message = {
        from: process.env.MAIL,
        to: correoUsur,
        subject: "Nuevo ticket registrado",
        text: "",
        html: `<p>Hemos registrado tu ticket ${numeroNota}, tienes una nueva trivia liberada.</p>`,
      };
    } else {
      message = {
        from: process.env.MAIL,
        to: correoUsur,
        subject: "Nuevo ticket registrado",
        text: "",
        html: `<p>Hemos registrado tu ticket ${numeroNota}, has alcanzado el número máximo de trivias.</p>`,
      };
    }

    const info = await mailer.sendMail(message);
    console.log(info);
  } catch (error) {
    console.error("Error enviando correo:", error);
    res
      .status(500)
      .json({ error: true, msg: "Error enviando correo" });
  }


  //le avisamos al usuario
  if (firebase_token) {

    let message = {};
    if (trivia_nueva <= 50) {

      message = {
        token: firebase_token,
        webpush: {
          fcmOptions: {
            link: 'https://maxaniversario.com/card.html'
          },
          notification: {
            title: '🎫 Nuevo ticket registrado',
            body: 'Tienes una nueva trivia liberada.',
            icon: '/icono.png'
          }
        }
      };
    } else {
      message = {
        token: firebase_token,
        webpush: {
          fcmOptions: {
            link: 'https://maxaniversario.com/card.html'
          },
          notification: {
            title: '🎫 Nuevo ticket registrado',
            body: 'Has alcanzado el número máximo de trivias',
            icon: '/icono.png'
          }
        }
      };
    }


    admin.messaging().send(message)
      .then((messageId) => {
        console.log('Notificación enviada, messageId =', messageId);

        if (trivia_nueva <= 50) {
          res.status(201).json({
            error: false,
            msg: "Hemos registrado tu ticket, tienes una nueva trivia liberada",
            nextTrivia: trivia_nueva,
            ticketId: idCompra,
          });
        } else {
          res.status(201).json({
            error: false,
            msg: "Hemos registrado tu ticket, has alcanzado el número máximo de trivias.",
            nextTrivia: trivia_nueva,
            ticketId: idCompra,
          });
        }

      })
      .catch((err) => {
        console.error('Error al enviar la notificación:', err);
        res.status(500).send('Error al enviar la notificación');
      });



  } else {
    if (trivia_nueva <= 50) {
      res.status(201).json({
        error: false,
        msg: "Hemos registrado tu ticket, tienes una nueva trivia liberada, pero no se enviaron notificaciones",
        nextTrivia: trivia_nueva,
        ticketId: idCompra,
      });
    } else {
      res.status(201).json({
        error: false,
        msg: "Hemos registrado tu ticket, has alcanzado el número máximo de trivias, pero no se enviaron notificaciones",
        nextTrivia: trivia_nueva,
        ticketId: idCompra,
      });

    }
  }
});

app.get("/trivias/:id", async (req, res) => {
  let userId = req.params.id;

  if (!userId) {
    return res.status(400).json({
      msg: "El id debe de tener algun valor",
      error: true,
    });
  }

  try {
    //let query = `SELECT * FROM conjunto_triv WHERE id_user_conj = ? AND (estatus_conj = 'asignada' OR estatus_conj = 'contestada')`;
    let query = `SELECT 
    ct.*,
    COALESCE(SUM(r.puntos_resp), 0) AS total_puntos
    FROM conjunto_triv ct
    LEFT JOIN respuestas r 
    ON ct.id_user_conj = r.id_usuario_resp 
    AND ct.num_trivia = r.id_conj_resp
    WHERE ct.id_user_conj = ? 
    AND (ct.estatus_conj = 'asignada' OR ct.estatus_conj = 'contestada')
    GROUP BY ct.num_trivia, ct.id_user_conj ORDER BY ct.num_trivia DESC`;

    let trivias = await db.pool.query(query, [userId]);
    trivias = trivias[0];

    res.status(200).json({ error: false, trivias });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/rank5", async (req, res) => {
  try {
    let query = `SELECT 
		nombre_usur,
		acumulado_usur,
    ranking_usur
    FROM usuarios WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL ORDER BY ranking_usur ASC LIMIT 5
        `;
    let rank5 = await db.pool.query(query);
    rank5 = rank5[0];

    res.status(200).json({ error: false, rank5 });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/rank5Store/:id", async (req, res) => {
  let storeId = req.params.id;

  if (!storeId) {
    return res.status(400).json({
      msg: "El id debe de tener algun valor",
      error: true,
    });
  }

  try {
    let query = `SELECT 
		nombre_usur,
		acumulado_usur,
    ranking_usur
    FROM usuarios WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND id_sucursal = ? ORDER BY ranking_usur ASC LIMIT 5
        `;
    let rank5Store = await db.pool.query(query, [storeId]);
    rank5Store = rank5Store[0];

    res.status(200).json({ error: false, rank5Store });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/rankPosition/:id", async (req, res) => {
  let userId = req.params.id;

  if (!userId) {
    return res.status(400).json({
      msg: "El id debe de tener algun valor",
      error: true,
    });
  }

  try {

    //my position
    let query = `SELECT 
		nombre_usur,
		acumulado_usur,
    ranking_usur
    FROM usuarios WHERE tipo_usur = 'Cliente' AND id_usuario = ?`;

    let myPosition = await db.pool.query(query, [userId]);
    myPosition = myPosition[0];
    const myRank = myPosition[0].ranking_usur;

    //one position up
    query = `SELECT 
		nombre_usur,
		acumulado_usur,
    ranking_usur
    FROM usuarios WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND ranking_usur < ? ORDER BY ranking_usur DESC LIMIT 1`;
    let upPosition = await db.pool.query(query, [myRank]);
    upPosition = upPosition[0];

    //one position down
    query = `SELECT 
		nombre_usur,
		acumulado_usur,
    ranking_usur
    FROM usuarios WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND ranking_usur > ? ORDER BY ranking_usur ASC LIMIT 1`;
    let downPosition = await db.pool.query(query, [myRank]);
    downPosition = downPosition[0];


    res.status(200).json({ error: false, myPosition, upPosition, downPosition });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/rankPositionStore/:id/:idSucursal", async (req, res) => {
  let userId = req.params.id;
  let storeId = req.params.idSucursal;

  if (!userId) {
    return res.status(400).json({
      msg: "El id debe de tener algun valor",
      error: true,
    });
  }
  if (!storeId) {
    return res.status(400).json({
      msg: "El idSucursal debe de tener algun valor",
      error: true,
    });
  }

  try {
    //ojo aca se calcula el ranking no se toma de la BD
    //my position
    let query = `
    SELECT 
    id_usuario,
    nombre_usur,
    acumulado_usur,
    ranking
    FROM (
      SELECT 
        id_usuario,
        nombre_usur,
        acumulado_usur,
        ROW_NUMBER() OVER (ORDER BY acumulado_usur DESC) AS ranking
      FROM usuarios
      WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND id_sucursal = ?
    ) AS subquery
    WHERE id_usuario = ?
    `;

    let myPosition = await db.pool.query(query, [storeId, userId]);
    myPosition = myPosition[0];
    const myRanking = myPosition[0].ranking;

    //one position up
    query = `SELECT 
    id_usuario,
    nombre_usur,
    acumulado_usur,
    ranking
    FROM (
      SELECT 
        id_usuario,
        nombre_usur,
        acumulado_usur,
        ROW_NUMBER() OVER (ORDER BY acumulado_usur DESC) AS ranking
      FROM usuarios
      WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND id_sucursal = ?
    ) AS subquery
    WHERE ranking = ?`;

    let rankAbove = myRanking - 1;
    let upPosition = await db.pool.query(query, [storeId, rankAbove]);
    upPosition = upPosition[0];

    //one position down
    query = `SELECT 
    id_usuario,
    nombre_usur,
    acumulado_usur,
    ranking
    FROM (
      SELECT 
        id_usuario,
        nombre_usur,
        acumulado_usur,
        ROW_NUMBER() OVER (ORDER BY acumulado_usur DESC) AS ranking
      FROM usuarios
      WHERE tipo_usur = 'Cliente' AND acumulado_usur IS NOT NULL AND id_sucursal = ?
    ) AS subquery
    WHERE ranking = ?`;

    let rankBelow = myRanking + 1;
    let downPosition = await db.pool.query(query, [storeId, rankBelow]);
    downPosition = downPosition[0];


    res.status(200).json({ error: false, myPositionStore: myPosition, upPositionStore: upPosition, downPositionStore: downPosition });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.post('/save-token', async (req, res) => {
  try {
    const token = req.body.token;  // Recibe el token del cliente
    const userId = req.body.userId; // ID del usuario (si lo necesitas)

    let errors = Array();

    if (!token) {
      errors.push({ msg: "No se recibió el token" });
    }
    if (!userId) {
      errors.push({ msg: "El campo userId debe de contener un valor" });
    }

    if (errors.length >= 1) {
      return res.status(400).json({
        msg: "Errores en los parametros",
        error: true,
        details: errors,
      });
    }

    let today = new Date();
    let date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    let time =
      today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let fecha = date + " " + time;
    let query = ``;

    query = `UPDATE usuarios SET
						firebase_token = '${token}', 
						updated_at  = '${fecha}'
	  				WHERE id_usuario = ${userId}`;


    let result = await db.pool.query(query);
    result = result[0];

    res
      .status(200)
      .json({ error: false, msg: "Token guardado correctamente" });

  } catch (error) {
    res.status(400).json({ error: true, details: error });
  }

});


//para probar hay que traer la funcion a este archivo
app.get('/test-cron', async (req, res) => {
  try {
    await cronRanking();
    res.send('Cron ejecutado correctamente');
  } catch (err) {
    res.status(500).send('Error al ejecutar cron' + err);
  }
});

module.exports = app;
