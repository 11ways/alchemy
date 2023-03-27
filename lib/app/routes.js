Router.add(['get', 'post'], 'APIResource', '/api/{action}', 'Api#{action}');
Router.get('AlchemyInfo', '/alchemy-info', 'AlchemyInfo#info');

Router.POSTPONED_ROUTE = Router.add({
	name             : 'AlchemyInfo#postponed',
	paths            : '/alchemy/postponed/{id}',
	methods          : ['get'],
	can_be_postponed : false,
});

Router.linkup('Syncable#linkup', 'syncablelink', 'AlchemyInfo#syncable');