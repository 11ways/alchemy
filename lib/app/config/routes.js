Router.add({
	name             : 'APIResource',
	paths            : '/api/{action}',
	handler          : 'Api#{action}',
	methods          : ['get', 'post'],
	visible_location : false,
	is_system_route  : true,
});

Router.add({
	name             : 'AlchemyInfo',
	paths            : '/alchemy-info',
	handler          : 'AlchemyInfo#info',
	methods          : ['get'],
	is_system_route  : true,
});

Router.POSTPONED_ROUTE = Router.add({
	name             : 'AlchemyInfo#postponed',
	paths            : '/alchemy/postponed/{id}',
	methods          : ['get'],
	can_be_postponed : false,
	is_system_route  : true,
});

Router.linkup('Syncable#linkup', 'syncablelink', 'AlchemyInfo#syncable');