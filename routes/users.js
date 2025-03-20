/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/authorization");
const db = require("../config/db");
const mailer = require("../controller/mailController");

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
	    created_at,
	    updated_at) 
	    VALUES 
	    (?, ?, ?, ?, ?, ?, ?, 'registrado', ?, ?)`;

    const values = [
      nombre_usur,
      correo_usur,
      tel_usur,
      ciudad_usur,
      forma_usur,
      hashedPassword,
      tipo_usur,
      fecha,
      fecha,
    ];

    let result = await db.pool.query(query, values);
    result = result[0];

    const payload = {
      user: {
        id: result.insertId,
        correo: correo_usur,
      },
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "1d" });

    //enviamos correo para que confirme su cuenta
    let message = {
      from: process.env.MAIL, // sender address
      to: correo_usur, // list of receivers
      subject: "Confirma tu cuenta", // Subject line
      text: "", // plain text body
      html: `<p>Haz click en el enlace para confirmar tu cuenta</p><a href="http://agencianuba.com/tintomax_aniversario/verified.html?token=${token}">Confirma tu cuenta</a>`,
    };
    const info = await mailer.sendMail(message);
    console.log(info);

    res.status(200).json({ error: false, msg: "Usuario creado exitosamente" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: true,
      msg: error,
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

    const payload = {
      user: {
        id: user.id_usuario,
        nombre: user.nombre_usur,
        correo: user.correo_usur,
        acumulado: user.acumulado_usur,
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
      res.json({ error: true, msg: "Hubo un error", error });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: true, msg: "Hubo un error", error });
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
      "SELECT id_usuario, nombre_usur, correo_usur, acumulado_usur, estatus_usur FROM usuarios WHERE id_usuario = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: true, msg: "Usuario no encontrado" });
    }

    // Devolvemos los datos del usuario
    res.status(200).json({ error: false, user: rows[0] });
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

app.post("/registrarTicket", async (req, res) => {
  try {
    const {
      numeroNota,
      idUnidad,
      cantidadPrendas,
      total,
      fechaCompra,
      idCliente,
      fotoTicket,
    } = req.body;

    // Validaciones básicas
    if (
      !numeroNota ||
      !idUnidad ||
      !cantidadPrendas ||
      !total ||
      !fechaCompra
    ) {
      return res
        .status(400)
        .json({ error: true, msg: "Faltan datos requeridos" });
    }

    let trivia = 0;

    if (total >= 80 && total <= 239) {
      trivia = 1;
    } else if (total >= 240 && total <= 399) {
      trivia = 2;
    } else if (total >= 400) {
      trivia = 3;
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
      cat_trivia_comp
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      numeroNota,
      idUnidad,
      cantidadPrendas,
      total,
      fechaCompra,
      idCliente,
      fotoTicket,
      fecha,
      trivia,
    ];

    let result = await db.pool.query(query, values);
    result = result[0];

    res.status(201).json({
      error: false,
      msg: "Ticket registrado exitosamente",
      ticketId: result.insertId,
    });
  } catch (error) {
    console.error("Error inesperado:", error);
    res
      .status(500)
      .json({ error: true, msg: "Error inesperado en el servidor" });
  }
});

module.exports = app;
