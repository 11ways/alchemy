Router.add(['get', 'post'], 'APIResource', '/resource/api/:name', 'AlchemyApiCalls#api');
Router.get('AlchemyInfo', '/alchemy-info', 'AlchemyInfo#info');