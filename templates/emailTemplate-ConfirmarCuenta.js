module.exports = function generarEmail(nombre, token) {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Confirmación de cuenta</title>
      </head>
      <body style="margin:0; padding:0; font-family:Arial, sans-serif; ">
        <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#e0f7fa">
          <tr>
            <td align="center">
              <table width="600" cellpadding="20" cellspacing="0" border="0" style="background-color: #ffffff;">
                <tr>
                  <td align="center">
                    <img src="https://max-tickets.s3.us-east-2.amazonaws.com/imagenes_correos/mail_header.png" alt="No olvides autorizar este correo a tu lista de deseados" width="100%" style="max-width:600px;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding-left: 40px;padding-right: 40px;">
                    <h2 style="color:#00695c; font-weight: bolder; font-family:Arial, sans-serif;">¡Hola, ${nombre}!</h2>
                    <p style="font-size:16px; color:#004d40;">
                      Ya falta poco para que puedas participar en la dinámica del 55 Aniversario de Tintorerías MAX.
                    </p>
                    <p style="font-size:16px; color:#004d40;">
                      Por favor, confirma tu dirección de correo electrónico en el siguiente enlace e inicia sesión. Al confirmar tu correo y registrar una compra, podrás contestar una trivia por cada registro y acumular puntos.
                    </p>
                    <p>
                      <a href="https://maxaniversario.com/verified.html?token=${token}" style="color:#004d40; font-weight: bold; margin: 0 auto;">
                        Confirmar mi cuenta
                      </a>
                    </p>
                    <p style="font-size:16px; color:#004d40;">
                      Premiamos tu lealtad, porque sin ti no habríamos llegado tan lejos. 
                      Participa, contesta las trivias , acumula puntos y gana.
                    </p>
                    <p style="font-weight:bolder; color:#004d40; text-align:center;">
                      Gracias por confiar en nosotros todos estos años<br />
                      ¡Te deseamos mucha suerte!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <img src="https://max-tickets.s3.us-east-2.amazonaws.com/imagenes_correos/mail_footer.png" alt="footer" width="100%" style="max-width:600px;" />
                    <p style="font-size:12px; color:#999;">
                      Si ya no desea participar en la dinámica, puede darse de baja en mi perfil.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  };
  