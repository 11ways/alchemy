const libpath = alchemy.use('path');

/**
 * Migrations
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 */
const Migration = Function.inherits('Alchemy.Base', function Migration(document) {
	this.document = document;
});

/**
 * Start the necesary migrations
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.4.1
 */
Migration.setStatic(async function start() {

	const AlchemyMigration = Model.get('System.Migration');

	console.log('Starting migration task...');

	let dir = new Classes.Alchemy.Inode.Directory(libpath.resolve(PATH_APP, 'migrations'));

	await dir.loadContents();

	// Sort entries alphabetically so numbered prefixes (001_, 002_) run in order
	let entries = [...dir].sort((a, b) => a.name.localeCompare(b.name));

	for (let entry of entries) {

		let name = entry.name.beforeLast('.js');

		if (!name) {
			continue;
		}

		let crit = AlchemyMigration.find();
		crit.where('name').equals(name);

		let record = await AlchemyMigration.find('first', crit);

		if (record) {
			if (record.ended) {
				console.log(' »» Migration "' + name + '" already finished on ' + record.ended.format('Y-m-d H:i'));
			} else if (record.error) {
				console.log(' »» Migration "' + name + '" failed with error: ' + record.error);
				console.log('Migrations stopped');
				return;
			} else {
				console.log(' »» Migration "' + name + '" has not yet finished!');
				console.log('Migrations stopped');
				return;
			}

			continue;
		}

		record = AlchemyMigration.createDocument();
		record.name = name;
		record.path = entry.path;

		await record.save();

		try {

			console.log(' »» Starting migration "' + name + '"');

			let migration = new Migration(record);

			await Blast.require(entry.path, {
				client: false,
				async : true,
				arguments: {
					names  : [
						'Blast',
						'Collection',
						'Bound',
						'Obj',
						'Fn',
						'migration'
					],
					values : [
						Blast,
						Blast.Collection,
						Blast.Bound,
						Blast.Bound.Object,
						Blast.Collection.Function,
						migration,
					]
				}
			});

		} catch (err) {
			console.log(' »» Migration error:', err);

			if (err instanceof Error) {
				record.error = err.message + '\n' + err.stack;
			} else {
				record.error = String(err);
			}

			try {
				await record.save();
			} catch (save_err) {
				// Without an `error` field the record reads as "has not
				// yet finished", which blocks all migrations with no
				// recovery hint - at least say what happened
				console.log(' »» Could not persist the migration failure:', save_err);
			}

			console.log('Migrations stopped');
			return;
		}

		// The success stamp lives OUTSIDE the try: a transient failure
		// while saving `ended` must not mark a COMPLETED migration as
		// failed (which would block all future migrations)
		record.ended = new Date();

		try {
			await record.save();
		} catch (save_err) {
			console.log(' »» Migration "' + name + '" finished, but its record could not be updated:', save_err);
			console.log('Migrations stopped');
			return;
		}
	}

	console.log('Executed all migrations');
});

/**
 * Migrate methods
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.3.1
 */
Migration.setMethod(function processRecords(model_name, fnc) {

	const model = Model.get(model_name);

	let options = {
		document       : false,
		parallel_limit : 1,
		return_raw_data: true,
	};

	let pledge = new Pledge();

	model.eachRecord(options, async (record, index, next) => {

		// A throwing handler must reach `next(err)`: without it the
		// iteration waits forever and the migration hangs with its
		// record stuck in the "has not yet finished" state
		try {
			await fnc(model, record[model_name], index);
		} catch (err) {
			return next(err);
		}

		next();
	}, (err) => {

		if (err) {
			pledge.reject(err);
		} else {
			pledge.resolve();
		}
	});

	return pledge;
});