/**
 * Módulo para manipular o banco de dados SQLite da votação
 */

// Para acesso ao FileSystem
const fs = require("fs");

// Inicialização do Banco de Dados
const dbFile = "./.data/votos.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const sqlite = require("sqlite");
let db;

// Para acesso ao FileSystem
// Solicitando a abertura do Banco de Dados
sqlite.open({ filename: dbFile, driver: sqlite3.Database})
  .then(async dBase => {
    db = dBase;
    try {
      if (!exists) {
        // Se o banco de dados não existe, ele será criado. Criando a tabela Voto
        await db.run(
          "CREATE TABLE Voto (id INTEGER PRIMARY KEY AUTOINCREMENT, linguagem VARCHAR[20], numVotos INTEGER)"
        );

        // Adiciono quais são as linguagens da votação
        await db.run(
          "INSERT INTO Voto (linguagem, numVotos) VALUES ('Python', 0), ('JavaScript', 0), ('Java', 0)"
        );

        // Criando a tabela Log
        await db.run(
          "CREATE TABLE Log (id INTEGER PRIMARY KEY AUTOINCREMENT, voto VARCHAR[80], hora STRING)"
        );
      } else {
        // Se já temos um banco de dados, lista os votos processados
        console.log(await db.all("SELECT * from Voto"));
      }
    } catch (dbError) {
      console.error(dbError);
    }
  });

module.exports = {
// Funções disponibilizadas pela exportação
  //--- Retorna o resultado atual da votação ---//
  obterVotos: async () => {
    try {
      return await db.all("SELECT * from Voto");
    } catch (dbError) {
      console.error(dbError);
    }
  },

  //--- processar novo voto ---//
  processarVoto: async (voto) => {
    try {
      // verificando se o voto é válido
      const resultado = await db.all("SELECT * from Voto WHERE linguagem = ?", voto);
      if (resultado.length > 0) {
        await db.run("INSERT INTO Log (voto, hora) VALUES (?, ?)", 
                     [voto,new Date().toISOString()]);
        await db.run(
          "UPDATE Voto SET numVotos = numVotos + 1 WHERE linguagem = ?", voto);
      }
      // Retorna o resultado atual da votação
      return await db.all("SELECT * from Voto");
    } catch (dbError) {
      console.error(dbError);
    }
  },

  //--- Retorna os últimos logs da votação  ---//
  obterLogs: async () => {
    // Retorna os 30 logs mais recentes
    try {
      return await db.all("SELECT * from Log ORDER BY hora DESC LIMIT 30");
    } catch (dbError) {
      console.error(dbError);
    }
  },

  //--- Limpa os logs e reset os votos ---//
  limparLogs: async () => {
    try {
      await db.run("DELETE from Log");
      await db.run("UPDATE Voto SET numVotos = 0");
      return [];
    } catch (dbError) {
      console.error(dbError);
    }
  }
}