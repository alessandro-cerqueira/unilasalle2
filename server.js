'use strict'

// Para Acessar o File System
const fs = require("fs");

// Para especificações de path 
const path = require("path");

// Para uso do Framework Fastify
const servidor = require("fastify")({
  logger: false //  Para visualizarmos o log do sistema
});


// Configurando o fastify para retornar os arquivos estáticos, como se fosse um servidor web simples
servidor.register(require("fastify-static"), {
  // Qual é a pasta que contém os arquivos estáticos
  root: path.join(__dirname, "public"),  
  // Prefixo para retornar os arquivos estáticos. 
  prefix: "/" 
});

// Configurando o Fastify para processar o input de dados vindos de formulários
servidor.register(require("fastify-formbody"));

// Registrando o template manager Point-of-View
servidor.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

// Realizando a carga dos Dados do SEO 
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

// Carga dos dados que descrevem o BD sqlite que vamos utilizar
const data = require("./src/data.json");
const db = require("./src/" + data.database);


const af = require("./ApresentaForm.js");
console.log("-->" + JSON.stringify(af));

// Apresenta o formulário caso o path seja / e requisição via get
servidor.get("/", af.getApresentaForm);

// Apresenta o resultado da votação caso o path seja / e a requisição seja post
servidor.post("/", postProcessarVoto);

// Apresenta o resultado da votação caso o path seja / e a requisição seja post
servidor.get("/resultado", getObterResultado);

// Apresenta os logs da votação caso o path seja /logs e a requisição seja get
servidor.get("/logs", getObterLogs);

// Resseta a votação caso o path seja /reset e a requisição seja post
servidor.post("/reset", postResetVotos );

// Colocando o servidor no ar 
servidor.listen(process.env.PORT, '0.0.0.0', function(err, address) {
  if (err) {
    servidor.log.error(err);
    process.exit(1);
  }
  console.log(`A aplicação está ouvindo em ${address}`);
  servidor.log.info('servidor ouvindo em ' + address);
});

//---------------------------------------------------------------------//

async function getApresentaForm_OLD(request, reply) {
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
};

//---------------------------------------------------------------------//

async function postProcessarVoto(request, reply) { 
  // Se a requisição NÃO veio com o parâmetro 'raw', vamos repassar o objeto SEO 
  // (Search Engine Optimization) que coloca dados nas tags META do arquivo hbs
  let params = request.query.raw ? {} : { seo: seo };

  // Flag para indicar que queremos mostrar os resultados da votação ao invés do formulário de votação
  params.verResultados = true;
  let votos;

  // Se tivermos um voto, enviaremos para o DAO para processá-lo e para obtermos os resultados
  if (request.body.linguagem) {
    votos = await db.processarVoto(request.body.linguagem);
    // O método processarVoto retorna os resultados presentes no Banco de Dados. 
    // Montamos uma lista com as linguagens e com os votos obtidos
    if (votos) {
      params.linguagens = votos.map(item => item.linguagem);
      params.totais = votos.map(item => item.numVotos);
    }
  }
  params.error = votos ? null : data.msgErro;

  // Se a requisição veio com o parâmetro 'raw', devolvo o JSON com o conteúdo dos votos. 
  // Se não, solicito a renderização da página index.hbs
  request.query.raw
    ? reply.send(params)
    : reply.view("/src/pages/index.hbs", params);
}

//---------------------------------------------------------------------//

async function getObterResultado(request, reply) { 
  // Se a requisição NÃO veio com o parâmetro 'raw', vamos repassar o objeto SEO 
  // (Search Engine Optimization) que coloca dados nas tags META do arquivo hbs
  let params = request.query.raw ? {} : { seo: seo };

  // Indicamos que queremos ver os resultados.
  params.verResultados = true;
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

  // Se a requisição veio com o parâmetro 'raw', devolvo o JSON com o conteúdo dos votos. 
  // Se não, solicito a renderização da página index.hbs
  reply.view("/src/pages/index.hbs", params);
}

//---------------------------------------------------------------------//

async function getObterLogs(request, reply) {
  // Se a requisição NÃO veio com o parâmetro 'raw', vamos repassar o objeto SEO 
  // (Search Engine Optimization) que coloca dados nas tags META do arquivo hbs
  let params = request.query.raw ? {} : { seo: seo };

  // obtem a lista de logs
  params.logs = await db.obterLogs();

  // Recuperando a mensagem de erro, caso tenha ocorrido algo
  params.error = params.logs ? null : data.msgErro;

  // Se a requisição veio com o parâmetro 'raw', devolvo o JSON com o conteúdo dos votos. 
  // Se não, solicito a renderização da página admin.hbs
  request.query.raw
    ? reply.send(params)
    : reply.view("/src/pages/admin.hbs", params);
}

//---------------------------------------------------------------------//

async function postResetVotos(request, reply) {
  // Se a requisição NÃO veio com o parâmetro 'raw', vamos repassar o objeto SEO 
  // (Search Engine Optimization) que coloca dados nas tags META do arquivo hbs
  let params = request.query.raw ? {} : { seo: seo };
 
   
  // Verificando se a autenticação foi realizada corretamente. 'process' é um 
  // objeto que provê informações e controle sobre a execução do processo Node.js
  if (!request.body.key || request.body.key.length < 1 ||
      !process.env.ADMIN_KEY || request.body.key !== process.env.ADMIN_KEY) {
    console.error("Falha na autenticação");

    // Define a mensagem de falha na autenticação 
    params.falha = "As credenciais enviadas são inválidas!";

    // Obtem a lista de logs
    params.logs = await db.obterLogs();
  } else {
    // Solicita a limpeza dos logs. 
    params.logs = await db.limparLogs();

    // Define a mensagem de erro, caso não tenha realizado a ação de limpeza com sucesso
    params.error = params.logs ? null : data.errorMessage;
  }

  // Envia o status 401 se a autenticação falhou. Se não, envia 200 
  const status = params.failed ? 401 : 200;
  // Se a requisição veio com o parâmetro 'raw', devolvo o JSON com o conteúdo dos votos. 
  // Se não, solicito a renderização da página admin.hbs
  request.query.raw ? reply.status(status).send(params)
                    : reply.status(status).view("/src/pages/admin.hbs", params);
};

//---------------------------------------------------------------------//
