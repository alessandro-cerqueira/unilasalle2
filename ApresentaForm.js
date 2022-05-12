const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

const data = require("./src/data.json");
const db = require("./src/" + data.database);

module.exports = {
  
  getApresentaForm: async (request, reply) => {
 
    // Se a requisição NÃO veio com o parâmetro 'raw', vamos repassar o objeto SEO 
    // (Search Engine Optimization) que coloca dados nas tags META do arquivo hbs
    let params = request.query.raw ? {} : { seo: seo };

    // Recuperando os votos do banco de dados. 
    // Montamos uma lista com as linguagens e com os votos obtidos
    const votos = await db.obterVotos();
    if (votos) {
      params.linguagens = votos.map(item => item.linguagem);
      params.totais = votos.map(item => item.numVotos);
    }
    else 
      // Se não obteve os votos, repassar a mensagem de erro. 
      params.error = data.msgErro;

    // Se o array de linguagens está vazio 
    if (votos && params.linguagens.length < 1)
      params.setup = data.msgSetup;

    // Se a requisição veio com o parâmetro 'raw', devolvo o JSON com o conteúdo dos votos. 
    // Se não, solicito a renderização da página index.hbs
    request.query.raw ? reply.send(params) : reply.view("/src/pages/index.hbs", params);
  }
};