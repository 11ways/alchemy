Router.add(['get', 'post'], 'APIResource', '/api/{action}', 'Api#{action}');
Router.get('AlchemyInfo', '/alchemy-info', 'AlchemyInfo#info');
Router.get('Postponed', '/alchemy/postponed/{id}', 'AlchemyInfo#postponed');