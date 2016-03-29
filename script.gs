/*
*******************************************************************
Script renova livro acervus Unicamp
Copyright (c) 2016 Thiago Pinto

Descrição: Esse script verifica se o usuário têm algum email na caixa de
entrada com descrição "Aviso de devolução" do domínio "unicamp.br"

Se houver ele renova todos os seus livros e envia um email de erro
para os livros que não puderam ser renovados.

Após renovar os livro o email é apagado.

Sugestão: Congifurar um trigger no google apps script para
executar esse script diariamente.

Atenção: Configurar seus dados na função setUserProperties

*******************************************************************
*/

/****************
* Configurações *
*****************/

function setUserProperties() {
  PropertiesService.getUserProperties().setProperty('login', '<seu login>');
  PropertiesService.getUserProperties().setProperty('password', '<sua senha>');
  PropertiesService.getUserProperties().setProperty('notificationEmail', '<seu email para receber notificações>');
}

function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperty('loginUrl', 'http://acervus.unicamp.br/mobile/ajx_efetua_login.asp?acesso=script_renova');
  PropertiesService.getScriptProperties().setProperty('renewUrl', 'http://acervus.unicamp.br/mobile/renovacoes.asp?acesso=script_renova');
  PropertiesService.getScriptProperties().setProperty('renewActionUrl', 'http://acervus.unicamp.br/mobile/renovar.asp?acesso=script_renova&');
}

/****************
* Main          *
*****************/

function main() {
  setUserProperties();

  var threads = getDevolutionEmailThreads();

  if(threads.length > 0) {
    renewBooks();
    threads[0].moveToTrash();
  }
}

/*************************************
* Funções de interação com o acervus *
**************************************/

function renewBooks() {
  var options = login();
  var renovationCodes = getRenovationCodes(options);
  for (var i = 0; i < renovationCodes.length; i++) {
    var response = UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('renewActionUrl') + renovationCodes[i] , options);
    Logger.log(response.getContentText());
    var responseText = response.getContentText();
    if(responseText.indexOf("Item não renovado.") > -1) {
      var bodyRegex = /(Título:.*?)<br \/>/g
      sendRenovationFailedEmail(bodyRegex.exec(responseText)[1]);
    }
  }
}

function login() {

  var payload =
      {
        "codigo" : PropertiesService.getUserProperties().getProperty('login'),
        "senha" : PropertiesService.getUserProperties().getProperty('password')
      };

  var response = post(PropertiesService.getScriptProperties().getProperty('loginUrl'), payload);
  var options =
      {
        'headers': {
          'Cookie' : response.getHeaders()["Set-Cookie"]
        }
      }

  return options;
}

function getRenovationCodes(options) {
  var regex = /codigo_circulacao=(\d+)/g;

  var response = UrlFetchApp.fetch(PropertiesService.getScriptProperties().getProperty('renewUrl'), options);
  var renovationCodes = [];

  while (matches = regex.exec(response.getContentText())) {
    renovationCodes.push(matches[0]);
  }

  return renovationCodes;
}


function post(url, payload) {

  var options =
      {
        "method" : "post",
        "payload" : payload
      };

  return UrlFetchApp.fetch(url, options);
}

/***********************************
* Funções de interação com o gmail *
************************************/

function getDevolutionEmailThreads() {
  return GmailApp.search('subject:aviso de devolução in:inbox from: unicamp.br');
}

function sendRenovationFailedEmail(body){
  GmailApp.sendEmail(PropertiesService.getScriptProperties().getProperty('notificationEmail'), 'Falha na renovação', body)
}
