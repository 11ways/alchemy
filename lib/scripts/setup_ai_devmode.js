/**
 * AI Development Mode Setup
 * 
 * This file is only loaded when --ai-devmode flag is passed.
 * It registers routes and the controller for AI-assisted development.
 *
 * SECURITY: Token-based authentication is required for all /_dev/* endpoints.
 * The token is generated at startup and must be provided via:
 *   - X-AI-Token header, OR
 *   - token query parameter
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
'use strict';

const crypto = require('crypto');

module.exports = function setupAiDevmode() {

	// Generate a random token for this session
	const token = crypto.randomBytes(32).toString('hex');
	alchemy.ai_devmode_token = token;

	// Log the token so alchemy-dev can parse it
	console.log('AI_DEVMODE_TOKEN=' + token);

	// Register the routes
	Router.add({
		name             : 'AiDevmode#health',
		paths            : '/_dev/health',
		methods          : ['get'],
		is_system_route  : true,
	});

	Router.add({
		name             : 'AiDevmode#login',
		paths            : '/_dev/login',
		methods          : ['get'],
		is_system_route  : true,
	});

	Router.add({
		name             : 'AiDevmode#inspect',
		paths            : '/_dev/inspect',
		methods          : ['post'],
		is_system_route  : true,
	});

	Router.add({
		name             : 'AiDevmode#document',
		paths            : '/_dev/document/{model_name}/{id}',
		methods          : ['get'],
		is_system_route  : true,
	});

	Router.add({
		name             : 'AiDevmode#logs',
		paths            : '/_dev/logs',
		methods          : ['get'],
		is_system_route  : true,
	});

	// Define the controller inline since it's only needed in devmode
	const AiDevmode = Function.inherits('Alchemy.Controller', function AiDevmode(conduit, options) {
		AiDevmode.super.call(this, conduit, options);
	});

	/**
	 * Validate the AI devmode token
	 * @param   {Conduit}   conduit
	 * @returns {boolean}   True if valid, false if response was sent
	 */
	function validateToken(conduit) {
		// Check header first, then query parameter
		let provided_token = conduit.headers['x-ai-token'] || conduit.param('token');

		if (!provided_token) {
			conduit.status = 401;
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({
				error   : 'Authentication required',
				message : 'Provide token via X-AI-Token header or token query parameter',
			}));
			return false;
		}

		if (provided_token !== alchemy.ai_devmode_token) {
			conduit.status = 401;
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({
				error   : 'Invalid token',
				message : 'The provided token is incorrect',
			}));
			return false;
		}

		return true;
	}

	/**
	 * Health check endpoint
	 * Returns 200 when server is fully ready
	 */
	AiDevmode.setAction(function health(conduit) {

		if (!validateToken(conduit)) return;

		let result = {
			status    : 'ok',
			uptime    : process.uptime(),
			memory    : process.memoryUsage(),
			timestamp : Date.now(),
		};

		conduit.setHeader('Content-Type', 'application/json');
		conduit.end(JSON.stringify(result, null, '\t'));
	});

	/**
	 * Auto-login endpoint
	 * Logs in the first user automatically
	 */
	AiDevmode.setAction(async function login(conduit) {

		if (!validateToken(conduit)) return;

		// Try to find the first user
		let User = this.getModel('User');

		if (!User) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'No User model found'}));
			return;
		}

		let user;

		try {
			user = await User.find('first');
		} catch (err) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'Failed to find user: ' + err.message}));
			return;
		}

		if (!user) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'No users found in database'}));
			return;
		}

		// Log in the user
		try {
			await conduit.session('UserData', user);
			
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({
				success : true,
				message : 'Logged in as ' + (user.username || user.email || user.$pk),
				user_id : String(user.$pk),
			}));
		} catch (err) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'Failed to create session: ' + err.message}));
		}
	});

	/**
	 * Server-side expression evaluation (REPL)
	 */
	AiDevmode.setAction(async function inspect(conduit) {

		if (!validateToken(conduit)) return;

		let body = conduit.body,
		    expr = body?.expr || body?.expression;

		if (!expr) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'No expression provided. POST {expr: "..."}'}));
			return;
		}

		try {
			// Create a context with useful variables
			let context = {
				alchemy,
				Model,
				Classes,
				Blast,
				conduit,
			};

			// Create an async function to allow await in expressions
			let asyncFn = new Function(
				...Object.keys(context),
				`return (async () => { return ${expr}; })()`
			);

			let result = await asyncFn(...Object.values(context));

			// Try to serialize the result
			let serialized;
			try {
				serialized = JSON.stringify(result, (key, value) => {
					if (typeof value === 'function') {
						return `[Function: ${value.name || 'anonymous'}]`;
					}
					if (typeof value === 'symbol') {
						return `[Symbol: ${value.toString()}]`;
					}
					if (value instanceof Error) {
						return {error: value.message, stack: value.stack};
					}
					return value;
				}, '\t');
			} catch (err) {
				serialized = JSON.stringify({
					type: typeof result,
					constructor: result?.constructor?.name,
					string: String(result),
				}, null, '\t');
			}

			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(serialized);

		} catch (err) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({
				error   : err.message,
				stack   : err.stack,
			}, null, '\t'));
		}
	});

	/**
	 * Document introspection endpoint
	 */
	AiDevmode.setAction(async function document(conduit, model_name, id) {

		if (!validateToken(conduit)) return;

		if (!model_name || !id) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({error: 'Usage: /_dev/document/:model/:id'}));
			return;
		}

		try {
			let ModelClass = this.getModel(model_name);

			if (!ModelClass) {
				conduit.setHeader('Content-Type', 'application/json');
				conduit.end(JSON.stringify({error: 'Model not found: ' + model_name}));
				return;
			}

			let doc = await ModelClass.findByPk(id);

			if (!doc) {
				conduit.setHeader('Content-Type', 'application/json');
				conduit.end(JSON.stringify({error: 'Document not found'}));
				return;
			}

			let result = {
				model_name      : model_name,
				document_class  : doc.constructor.name,
				$pk             : String(doc.$pk),
				$model_name     : doc.$model_name,
				$model_alias    : doc.$model_alias,
				$record_keys    : Object.keys(doc.$record || {}),
				$record         : doc.$record,
				field_names     : Object.keys(ModelClass.schema?.fields || {}),
			};

			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify(result, null, '\t'));

		} catch (err) {
			conduit.setHeader('Content-Type', 'application/json');
			conduit.end(JSON.stringify({
				error : err.message,
				stack : err.stack,
			}, null, '\t'));
		}
	});

	/**
	 * Recent logs endpoint
	 */
	AiDevmode.setAction(function logs(conduit) {

		if (!validateToken(conduit)) return;

		let logs = [];

		if (alchemy.Janeway?.logList) {
			let logList = alchemy.Janeway.logList;
			let count = Math.min(logList.length, 100);
			
			for (let i = logList.length - count; i < logList.length; i++) {
				let entry = logList[i];
				if (entry) {
					logs.push({
						time    : entry.time,
						type    : entry.type,
						message : entry.args?.join(' ') || String(entry),
					});
				}
			}
		} else {
			logs.push({message: 'Janeway not available for log retrieval'});
		}

		conduit.setHeader('Content-Type', 'application/json');
		conduit.end(JSON.stringify({logs}, null, '\t'));
	});

	log.info('AI devmode enabled');
};
