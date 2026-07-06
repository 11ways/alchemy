var assert = require('assert');

/**
 * The Fallback datasource queues saves locally when the remote (lower)
 * datasource is unreachable, and replays them later. These tests run that
 * machinery server-side with two mongo databases: `fb_upper_db` plays the
 * local cache, `fb_lower_db` plays the remote, and "being offline" is
 * simulated by stubbing the lower datasource's read/create/update.
 *
 * The drain methods (getRecordsToBeSavedRemotely and its conflict check)
 * are defined on the CLIENT Model class - the very functions the browser
 * runs - and are grafted onto the server model instance here, since they
 * only rely on this.datasource / createDocument / find.
 */
describe('Fallback Datasource sync', function() {

	this.timeout(30000);

	let fallback_tester,
	    upper_ds,
	    lower_ds,
	    fb_ds;

	// The stubbed-out lower methods, so they can be restored
	let stubbed = null;

	function goOffline() {

		if (stubbed) {
			return;
		}

		stubbed = {
			read   : lower_ds.read,
			create : lower_ds.create,
			update : lower_ds.update,
		};

		let fail = () => Classes.Pledge.reject(new Error('Simulated offline'));

		lower_ds.read = fail;
		lower_ds.create = fail;
		lower_ds.update = fail;
	}

	function goOnline() {

		if (!stubbed) {
			return;
		}

		Object.assign(lower_ds, stubbed);
		stubbed = null;
	}

	// A failed assertion mid-test must not leak the offline stubs into the
	// next test
	afterEach(function() {
		goOnline();
	});

	before(async function() {

		let default_ds = Datasource.get('default');

		// Two sibling databases on the same mongo-unit instance
		let base_uri = default_ds.uri.replace(/\/[^/?]*(\?.*)?$/, '');

		upper_ds = Datasource.create('mongo', 'fb_upper', {uri: base_uri + '/fb_upper_db'});
		lower_ds = Datasource.create('mongo', 'fb_lower', {uri: base_uri + '/fb_lower_db'});
		fb_ds = Datasource.create('fallback', 'fb_sync', {upper: 'fb_upper', lower: 'fb_lower'});

		// Runtime-created datasources miss the boot stage that connects them
		await upper_ds.setup();
		await lower_ds.setup();
		await fb_ds.connect();

		await createModel(function FallbackSyncTester() {
			this.setProperty('dbConfig', 'fb_sync');
			this.addField('title', 'String');
		});

		fallback_tester = Model.get('FallbackSyncTester');

		// Graft the client-side drain methods (the browser code under test)
		let client_proto = Classes.Alchemy.Client.Model.Model.prototype;
		fallback_tester.getRecordsToBeSavedRemotely = client_proto.getRecordsToBeSavedRemotely;
		fallback_tester.shouldPushLocalSave = client_proto.shouldPushLocalSave;
	});

	// The remote side is asserted through the raw collection: the fallback
	// stack stores ids as strings (its native, browser-style format), which a
	// second mongo-configured model would cast to ObjectIds and miss.
	async function readRemote(id) {
		let col = await lower_ds.collection('fallback_sync_testers');
		return col.findOne({_id: String(id)});
	}

	async function updateRemote(id, values) {
		let col = await lower_ds.collection('fallback_sync_testers');
		return col.updateOne({_id: String(id)}, {$set: Object.assign({updated: new Date()}, values)});
	}

	it('queues an offline save and replays it once the remote is reachable', async function() {

		goOffline();

		let doc = fallback_tester.createDocument();
		doc.title = 'made offline';
		await doc.save();

		goOnline();

		// The remote never saw the record
		let remote = await readRemote(doc.$pk);
		assert.strictEqual(remote, null, 'the record should not exist remotely yet');

		// The drain should offer it for replay (a pending create)
		let records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 1, 'the offline save should be queued for replay');

		await records[0].save();

		remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'made offline', 'the replay should reach the remote database');

		// And the flag should be cleared
		records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 0, 'the queue should be empty after the replay');
	});

	it('drops a stale queued save when the remote version is newer', async function() {

		// Create online: exists on both sides
		let doc = fallback_tester.createDocument();
		doc.title = 'original';
		await doc.save();

		let remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'original', 'the online create should have reached the remote');

		// Edit offline: queued locally
		goOffline();
		doc.title = 'stale local edit';
		await doc.save();
		goOnline();

		// The remote moves on AFTER that local edit was made
		await Classes.Pledge.after(5);

		await updateRemote(doc.$pk, {title: 'remote moved on'});

		// The drain must NOT offer the stale record...
		let records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 0, 'the stale local edit must not be replayed');

		// ...the remote version must survive...
		remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'remote moved on', 'the newer remote version must win');

		// ...the local cache must have adopted it...
		let local = await fallback_tester.find('first', {conditions: {_id: doc.$pk}, only_local: true});
		assert.strictEqual(local?.title, 'remote moved on', 'the local cache should adopt the remote version');

		// ...and the flag must be gone for good
		records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 0, 'the conflict should be resolved permanently');
	});

	it('replays an offline edit of an existing record when the remote is unchanged', async function() {

		// The everyday case: the record exists on both sides, the user edits
		// it offline, nothing else touches it. The conflict check compares
		// the remote `updated` against the queued edit's local-save time -
		// the edit is newer, so it MUST be pushed (not adopted away).
		let doc = fallback_tester.createDocument();
		doc.title = 'sync me v1';
		await doc.save();

		await Classes.Pledge.after(5);

		goOffline();
		doc.title = 'sync me v2 (edited offline)';
		await doc.save();
		goOnline();

		let records = await fallback_tester.getRecordsToBeSavedRemotely();
		let queued = records.toArray ? records.toArray() : records;
		queued = queued.filter(r => String(r.$pk) == String(doc.$pk));
		assert.strictEqual(queued.length, 1, 'the offline edit must be offered for replay');

		await queued[0].save();

		let remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'sync me v2 (edited offline)', 'the offline edit must reach the remote');
	});

	it('re-caching a revived document must not wipe its pending-save flag', async function() {

		goOffline();

		let doc = fallback_tester.createDocument();
		doc.title = 'queued edit';
		await doc.save();

		goOnline();

		// Revive the record from the cache (this strips the raw `_$` fields
		// from the app-side data) and run the document cache-refresh, like
		// the browser does after every read. It used to re-store the record
		// without its needs-remote-save flag, silently unqueueing the save.
		let revived = await fallback_tester.find('first', {conditions: {_id: doc.$pk}, only_local: true});

		let informDatasource = Classes.Alchemy.Client.Document.Document.prototype.informDatasource;
		await new Promise((resolve, reject) => {
			informDatasource.call(revived, {}, err => err ? reject(err) : resolve());
		});

		let records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 1, 'the pending save must survive the cache refresh');

		// Its original local-save time must survive too (a re-stamped "now"
		// would make a stale edit beat newer remote versions)
		let raw = await fb_ds.getUpperVersion(fallback_tester, doc.$pk);
		assert.strictEqual(raw._$needs_remote_save, 1, 'the raw row should still be flagged');

		await records[0].save();

		let remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'queued edit', 'the queued save should still reach the remote');
	});

	it('defers the replay (keeping the flag) while the remote is unreachable', async function() {

		goOffline();

		let doc = fallback_tester.createDocument();
		doc.title = 'still offline';
		await doc.save();

		// Still offline: the conflict check cannot ask the remote, so the
		// record is held back - but stays queued.
		let records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 0, 'nothing should be replayed while offline');

		goOnline();

		records = await fallback_tester.getRecordsToBeSavedRemotely();
		assert.strictEqual(records.length, 1, 'the record should still be queued once back online');

		await records[0].save();

		let remote = await readRemote(doc.$pk);
		assert.strictEqual(remote?.title, 'still offline', 'the deferred record should sync in the end');
	});
});
