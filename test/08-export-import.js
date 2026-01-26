var assert = require('assert'),
    stream = require('stream');

describe('Export/Import', function() {

	var ExportItem,
	    ExportCategory,
	    export_item_id,
	    export_category_id;

	describe('Setup test models', function() {

		it('should create ExportCategory model', function(done) {
			ExportCategory = Function.inherits('Alchemy.Model', function ExportCategory(options) {
				ExportCategory.super.call(this, options);
			});

			ExportCategory.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('priority', 'Integer');
				done();
			});
		});

		it('should create ExportItem model', function(done) {
			ExportItem = Function.inherits('Alchemy.Model', function ExportItem(options) {
				ExportItem.super.call(this, options);
			});

			ExportItem.constitute(function addFields() {
				this.addField('title', 'String');
				this.addField('description', 'Text');
				this.addField('published_at', 'Datetime');
				this.addField('count', 'Integer');
				this.addField('active', 'Boolean');
				this.addField('tags', 'String', {array: true});
				this.belongsTo('ExportCategory');
				done();
			});
		});

		it('should create test data', async function() {
			let Category = Model.get('ExportCategory');
			let Item = Model.get('ExportItem');

			// Create a category
			let category = Category.createDocument();
			category.name = 'Test Category';
			category.priority = 10;
			await category.save();
			export_category_id = category._id;

			// Create an item
			let item = Item.createDocument();
			item.title = 'Test Item';
			item.description = 'This is a test item for export/import testing';
			item.published_at = new Date('2025-06-15T10:30:00Z');
			item.count = 42;
			item.active = true;
			item.tags = ['test', 'export', 'import'];
			item.export_category_id = export_category_id;
			await item.save();
			export_item_id = item._id;
		});
	});

	describe('Document#exportToStream(output)', function() {

		it('should export a single document to a stream', async function() {
			let Item = Model.get('ExportItem');
			let item = await Item.findByPk(export_item_id);

			let chunks = [];
			let output = new stream.PassThrough();

			output.on('data', chunk => chunks.push(chunk));

			await item.exportToStream(output);

			let buffer = Buffer.concat(chunks);

			// Should start with 0x02 marker (document)
			assert.strictEqual(buffer.readUInt8(0), 0x02, 'First byte should be 0x02 marker');

			// Should have 4-byte size after marker
			let size = buffer.readUInt32BE(1);
			assert.strictEqual(buffer.length, 5 + size, 'Buffer should be header (5 bytes) + data');
		});
	});

	describe('Document#importFromBuffer(buffer)', function() {

		it('should import a document from exported buffer', async function() {
			let Item = Model.get('ExportItem');
			let original = await Item.findByPk(export_item_id);

			// Store original values for comparison
			let originalData = {
				title: original.title,
				description: original.description,
				count: original.count,
				active: original.active,
				tags: [...original.tags],
				export_category_id: original.export_category_id,
				published_at: new Date(original.published_at.getTime()),
				_id: original._id
			};

			// Export the document
			let chunks = [];
			let output = new stream.PassThrough();
			output.on('data', chunk => chunks.push(chunk));
			await original.exportToStream(output);
			let buffer = Buffer.concat(chunks);

			// Extract just the data portion (skip header)
			let dataBuffer = buffer.slice(5);

			// Delete the original document before importing (can't have duplicate IDs)
			await original.remove();

			// Verify it's deleted
			let deleted = await Item.findByPk(export_item_id);
			assert.strictEqual(deleted, null, 'Original should be deleted');

			// Create a new document and import
			let imported = Item.createDocument();
			await imported.importFromBuffer(dataBuffer);

			// Verify the data
			assert.strictEqual(imported.title, originalData.title);
			assert.strictEqual(imported.description, originalData.description);
			assert.strictEqual(imported.count, originalData.count);
			assert.strictEqual(imported.active, originalData.active);
			assert.deepStrictEqual(imported.tags, originalData.tags);
			assert.strictEqual(String(imported.export_category_id), String(originalData.export_category_id));

			// Verify Date preservation
			assert.strictEqual(imported.published_at instanceof Date, true, 'published_at should be a Date');
			assert.strictEqual(imported.published_at.getTime(), originalData.published_at.getTime());

			// Verify ObjectId preservation
			assert.strictEqual(String(imported._id).isObjectId(), true, 'imported _id should be ObjectId');
			assert.strictEqual(String(imported._id), String(originalData._id));

			// Update global reference for other tests
			export_item_id = imported._id;
		});
	});

	describe('Model#exportToStream(output)', function() {

		it('should export all documents of a model', async function() {
			let Item = Model.get('ExportItem');

			let chunks = [];
			let output = new stream.PassThrough();
			output.on('data', chunk => chunks.push(chunk));

			await Item.exportToStream(output);

			let buffer = Buffer.concat(chunks);

			// Should start with 0x01 marker (model header)
			assert.strictEqual(buffer.readUInt8(0), 0x01, 'First byte should be 0x01 marker');

			// Second byte is model name length
			let nameLen = buffer.readUInt8(1);
			let modelName = buffer.slice(2, 2 + nameLen).toString();
			assert.strictEqual(modelName, 'ExportItem', 'Model name should be ExportItem');

			// After model header, should have document(s)
			let docStart = 2 + nameLen;
			assert.strictEqual(buffer.readUInt8(docStart), 0x02, 'Should have 0x02 marker after model header');
		});
	});

	describe('Model#importFromStream(input)', function() {

		it('should import documents into the model', async function() {
			let Item = Model.get('ExportItem');

			// First create some data to export
			let testDoc = Item.createDocument();
			testDoc.title = 'Model Import Test';
			testDoc.count = 55;
			await testDoc.save();
			let testId = testDoc._id;

			// Export existing data
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Verify export has data
			assert.strictEqual(exportBuffer.length > 0, true, 'Export should have data');

			// Delete all existing documents
			let existing = await Item.find('all');
			for (let doc of existing) {
				await doc.remove();
			}

			// Verify deletion
			let afterDelete = await Item.find('all');
			assert.strictEqual(afterDelete.length, 0, 'All documents should be deleted');

			// Import from the exported stream
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);

			// Write the exported data
			importInput.write(exportBuffer);
			importInput.end();

			await importPromise;

			// Verify import
			let afterImport = await Item.find('all');
			assert.strictEqual(afterImport.length >= 1, true, 'Should have at least 1 document after import');

			// Check that our test document was restored
			let restored = await Item.findByPk(testId);
			assert.strictEqual(!!restored, true, 'Test document should be restored');
			assert.strictEqual(restored.title, 'Model Import Test');
			assert.strictEqual(restored.count, 55);
		});

		it('should reject when model names do not match', async function() {
			let Item = Model.get('ExportItem');
			let Category = Model.get('ExportCategory');

			// Export a category
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));

			// Create a category first
			let cat = Category.createDocument();
			cat.name = 'Mismatch Test';
			cat.priority = 5;
			await cat.save();

			await Category.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Try to import into wrong model
			let importInput = new stream.PassThrough();
			let caught = null;

			try {
				let importPromise = Item.importFromStream(importInput);
				importInput.write(exportBuffer);
				importInput.end();
				await importPromise;
			} catch (err) {
				caught = err;
			}

			assert.strictEqual(!!caught, true, 'Should have thrown an error');
			assert.strictEqual(caught.message.includes('Model names do not match'), true,
				'Error should mention model name mismatch');
		});
	});

	describe('alchemy.exportToStream(output)', function() {

		it('should export all models to a stream', async function() {
			let chunks = [];
			let output = new stream.PassThrough();
			output.on('data', chunk => chunks.push(chunk));

			await alchemy.exportToStream(output);

			let buffer = Buffer.concat(chunks);

			// Should have at least some data
			assert.strictEqual(buffer.length > 0, true, 'Should have exported some data');

			// Count model headers (0x01 markers)
			let modelCount = 0;
			let offset = 0;

			while (offset < buffer.length) {
				let marker = buffer.readUInt8(offset);

				if (marker === 0x01) {
					modelCount++;
					let nameLen = buffer.readUInt8(offset + 1);
					offset += 2 + nameLen;
				} else if (marker === 0x02) {
					let size = buffer.readUInt32BE(offset + 1);
					offset += 5 + size;
				} else if (marker === 0xFF) {
					let size = buffer.readUInt32BE(offset + 1);
					offset += 5 + size;
				} else {
					break;
				}
			}

			assert.strictEqual(modelCount >= 2, true, 'Should have at least 2 model headers (ExportItem and ExportCategory)');
		});
	});

	describe('alchemy.importFromStream(input)', function() {

		it('should import multiple models from a stream', async function() {
			let Item = Model.get('ExportItem');
			let Category = Model.get('ExportCategory');

			// Clear existing data first
			let existingItems = await Item.find('all');
			for (let doc of existingItems) {
				await doc.remove();
			}
			let existingCategories = await Category.find('all');
			for (let doc of existingCategories) {
				await doc.remove();
			}

			// Create specific test data
			let cat = Category.createDocument();
			cat.name = 'Multi Model Test Cat';
			cat.priority = 77;
			await cat.save();
			let catId = cat._id;

			let item = Item.createDocument();
			item.title = 'Multi Model Test Item';
			item.count = 88;
			item.export_category_id = catId;
			await item.save();
			let itemId = item._id;

			// Export ONLY our test models (not the full database)
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));

			// Export each model separately
			await Category.exportToStream(exportOutput);
			await Item.exportToStream(exportOutput);

			let exportBuffer = Buffer.concat(chunks);

			// Delete all ExportItem and ExportCategory documents
			await item.remove();
			await cat.remove();

			// Verify deletion
			let afterDeleteItems = await Item.find('all');
			let afterDeleteCategories = await Category.find('all');
			assert.strictEqual(afterDeleteItems.length, 0, 'All items should be deleted');
			assert.strictEqual(afterDeleteCategories.length, 0, 'All categories should be deleted');

			// Import from the export (alchemy.importFromStream handles multiple models)
			let importInput = new stream.PassThrough();
			let importPromise = alchemy.importFromStream(importInput);

			importInput.write(exportBuffer);
			importInput.end();

			await importPromise;

			// Verify import
			let restoredItem = await Item.findByPk(itemId);
			let restoredCategory = await Category.findByPk(catId);

			assert.strictEqual(!!restoredItem, true, 'Item should be restored');
			assert.strictEqual(!!restoredCategory, true, 'Category should be restored');
			assert.strictEqual(restoredItem.title, 'Multi Model Test Item');
			assert.strictEqual(restoredItem.count, 88);
			assert.strictEqual(restoredCategory.name, 'Multi Model Test Cat');
			assert.strictEqual(restoredCategory.priority, 77);
		});
	});

	describe('ImportStreamParser - chunk boundary handling', function() {

		it('should handle data split across TCP chunks correctly', async function() {
			let Item = Model.get('ExportItem');

			// Delete all existing documents first
			let existingDocs = await Item.find('all');
			for (let doc of existingDocs) {
				await doc.remove();
			}

			// Create a test item
			let testItem = Item.createDocument();
			testItem.title = 'Chunk Test Item';
			testItem.count = 123;
			await testItem.save();
			let testItemId = testItem._id;

			// Export it
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let fullBuffer = Buffer.concat(chunks);

			// Delete the document
			await testItem.remove();

			// Now import with artificially split chunks to test boundary handling
			// Split at fixed positions to test the state machine
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);

			// Split the buffer at specific problematic points:
			// Header is 2 bytes (model), then document header is 5 bytes
			// Split in the middle of these to test boundary handling
			let splits = [1, 3, 5, 10, 20, fullBuffer.length];
			let lastPos = 0;

			for (let splitPos of splits) {
				if (splitPos <= lastPos || splitPos > fullBuffer.length) continue;
				let chunk = fullBuffer.slice(lastPos, splitPos);
				importInput.write(chunk);
				lastPos = splitPos;
				
				// Small delay to simulate network
				await new Promise(resolve => setImmediate(resolve));
			}
			importInput.end();

			await importPromise;

			// Verify import succeeded
			let imported = await Item.findByPk(testItemId);
			assert.strictEqual(!!imported, true, 'Document should be imported');
			assert.strictEqual(imported.title, 'Chunk Test Item');
			assert.strictEqual(imported.count, 123);
		});

		it('should handle split at marker boundary (partial header)', async function() {
			let Item = Model.get('ExportItem');

			// Get existing items to export
			let items = await Item.find('all');
			if (items.length === 0) {
				// Create one if needed
				let item = Item.createDocument();
				item.title = 'Split Test';
				item.count = 1;
				await item.save();
			}

			// Export
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let fullBuffer = Buffer.concat(chunks);

			// Find the document marker (0x02) position
			let modelNameLen = fullBuffer.readUInt8(1);
			let docMarkerPos = 2 + modelNameLen;

			// Delete all items before import
			items = await Item.find('all');
			for (let item of items) {
				await item.remove();
			}

			// Split right at the 0x02 marker - send just the marker byte
			// This tests that we don't consume the marker until we have full header
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);

			// Send everything up to and including the 0x02 marker, but not the size bytes
			importInput.write(fullBuffer.slice(0, docMarkerPos + 1));
			await new Promise(resolve => setImmediate(resolve));

			// Now send just 2 of the 4 size bytes
			importInput.write(fullBuffer.slice(docMarkerPos + 1, docMarkerPos + 3));
			await new Promise(resolve => setImmediate(resolve));

			// Send the rest
			importInput.write(fullBuffer.slice(docMarkerPos + 3));
			importInput.end();

			await importPromise;

			// Verify import worked
			let afterImport = await Item.find('all');
			assert.strictEqual(afterImport.length >= 1, true, 'Should have imported at least 1 document');
		});
	});

	describe('Type preservation', function() {

		it('should preserve Date objects through export/import', async function() {
			let Item = Model.get('ExportItem');

			// Clear all items first
			let existing = await Item.find('all');
			for (let doc of existing) {
				await doc.remove();
			}

			let testDate = new Date('2024-03-15T14:30:45.123Z');

			let item = Item.createDocument();
			item.title = 'Date Test';
			item.published_at = testDate;
			item.count = 1;
			await item.save();
			let itemId = item._id;

			// Export
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Delete
			await item.remove();

			// Import
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);
			importInput.write(exportBuffer);
			importInput.end();
			await importPromise;

			// Verify
			let imported = await Item.findByPk(itemId);
			assert.strictEqual(imported.published_at instanceof Date, true, 'Should be a Date instance');
			assert.strictEqual(imported.published_at.getTime(), testDate.getTime(), 'Date value should match');
		});

		it('should preserve ObjectId through export/import', async function() {
			let Item = Model.get('ExportItem');
			let Category = Model.get('ExportCategory');

			// Clear items first
			let existingItems = await Item.find('all');
			for (let doc of existingItems) {
				await doc.remove();
			}

			// Create a category
			let cat = Category.createDocument();
			cat.name = 'ObjectId Test Cat';
			cat.priority = 1;
			await cat.save();
			let catId = cat._id;

			// Create item with reference
			let item = Item.createDocument();
			item.title = 'ObjectId Test';
			item.count = 1;
			item.export_category_id = catId;
			await item.save();
			let itemId = item._id;

			// Export just the item
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Delete the item
			await item.remove();

			// Import
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);
			importInput.write(exportBuffer);
			importInput.end();
			await importPromise;

			// Verify
			let imported = await Item.findByPk(itemId);
			assert.strictEqual(String(imported._id).isObjectId(), true, '_id should be ObjectId');
			assert.strictEqual(String(imported.export_category_id).isObjectId(), true, 'FK should be ObjectId');
			assert.strictEqual(String(imported.export_category_id), String(catId), 'FK value should match');
		});

		it('should preserve arrays through export/import', async function() {
			let Item = Model.get('ExportItem');

			// Clear items first
			let existingItems = await Item.find('all');
			for (let doc of existingItems) {
				await doc.remove();
			}

			let testTags = ['alpha', 'beta', 'gamma', 'delta'];

			let item = Item.createDocument();
			item.title = 'Array Test';
			item.count = 1;
			item.tags = testTags;
			await item.save();
			let itemId = item._id;

			// Export
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Delete
			await item.remove();

			// Import
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);
			importInput.write(exportBuffer);
			importInput.end();
			await importPromise;

			// Verify
			let imported = await Item.findByPk(itemId);
			assert.strictEqual(Array.isArray(imported.tags), true, 'Should be an array');
			assert.deepStrictEqual(imported.tags, testTags, 'Array values should match');
		});

		it('should preserve boolean values through export/import', async function() {
			let Item = Model.get('ExportItem');

			// Clear items first
			let existingItems = await Item.find('all');
			for (let doc of existingItems) {
				await doc.remove();
			}

			// Test with true
			let itemTrue = Item.createDocument();
			itemTrue.title = 'Boolean True Test';
			itemTrue.count = 1;
			itemTrue.active = true;
			await itemTrue.save();
			let trueId = itemTrue._id;

			// Test with false
			let itemFalse = Item.createDocument();
			itemFalse.title = 'Boolean False Test';
			itemFalse.count = 1;
			itemFalse.active = false;
			await itemFalse.save();
			let falseId = itemFalse._id;

			// Export
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Delete both
			await itemTrue.remove();
			await itemFalse.remove();

			// Import
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);
			importInput.write(exportBuffer);
			importInput.end();
			await importPromise;

			// Verify
			let importedTrue = await Item.findByPk(trueId);
			let importedFalse = await Item.findByPk(falseId);

			assert.strictEqual(importedTrue.active, true, 'Boolean true should be preserved');
			assert.strictEqual(importedFalse.active, false, 'Boolean false should be preserved');
		});
	});

	describe('Empty collection handling', function() {

		it('should handle export of empty model', async function() {
			// Create a new model with no data
			let EmptyModel = Function.inherits('Alchemy.Model', function ExportEmptyTest(options) {
				ExportEmptyTest.super.call(this, options);
			});

			let constituted = new Pledge();
			EmptyModel.constitute(function addFields() {
				this.addField('name', 'String');
				constituted.resolve();
			});

			await constituted;

			let Empty = Model.get('ExportEmptyTest');

			// Export empty model
			let chunks = [];
			let output = new stream.PassThrough();
			output.on('data', chunk => chunks.push(chunk));
			await Empty.exportToStream(output);

			let buffer = Buffer.concat(chunks);

			// Should have model header but no documents
			assert.strictEqual(buffer.readUInt8(0), 0x01, 'Should have model header');
			let nameLen = buffer.readUInt8(1);
			let expectedLen = 2 + nameLen; // Just the header, no documents
			assert.strictEqual(buffer.length, expectedLen, 'Should only have header, no documents');
		});

		it('should handle import into model with existing data', async function() {
			let Item = Model.get('ExportItem');

			// First, clear all items
			let allItems = await Item.find('all');
			for (let doc of allItems) {
				await doc.remove();
			}

			// Create document to export (this will be deleted and re-imported)
			let toExport = Item.createDocument();
			toExport.title = 'Imported Item';
			toExport.count = 111;
			await toExport.save();
			let exportId = toExport._id;

			// Export just this document
			let chunks = [];
			let exportOutput = new stream.PassThrough();
			exportOutput.on('data', chunk => chunks.push(chunk));
			await Item.exportToStream(exportOutput);
			let exportBuffer = Buffer.concat(chunks);

			// Delete the exported item
			await toExport.remove();

			// Now create an "existing" document (with a DIFFERENT ID)
			let existing = Item.createDocument();
			existing.title = 'Existing Item';
			existing.count = 999;
			await existing.save();
			let existingId = existing._id;

			// Import - should add without affecting existing
			let importInput = new stream.PassThrough();
			let importPromise = Item.importFromStream(importInput);
			importInput.write(exportBuffer);
			importInput.end();
			await importPromise;

			// Both should exist now
			let existingAfter = await Item.findByPk(existingId);
			let importedAfter = await Item.findByPk(exportId);

			assert.strictEqual(!!existingAfter, true, 'Existing item should still exist');
			assert.strictEqual(!!importedAfter, true, 'Imported item should exist');
			assert.strictEqual(existingAfter.title, 'Existing Item');
			assert.strictEqual(importedAfter.title, 'Imported Item');

			// Verify we have exactly 2 items
			let finalItems = await Item.find('all');
			assert.strictEqual(finalItems.length, 2, 'Should have exactly 2 items');
		});
	});

	describe('Error handling', function() {

		it('should reject on invalid marker byte', async function() {
			let Item = Model.get('ExportItem');

			let importInput = new stream.PassThrough();
			let caught = null;

			try {
				let importPromise = Item.importFromStream(importInput);

				// Write invalid marker
				importInput.write(Buffer.from([0x99, 0x00, 0x00, 0x00, 0x00]));
				importInput.end();

				await importPromise;
			} catch (err) {
				caught = err;
			}

			assert.strictEqual(!!caught, true, 'Should have thrown an error');
			assert.strictEqual(caught.message.includes('Unknown marker'), true,
				'Error should mention unknown marker');
		});

		it('should reject when no model resolver is set', async function() {
			let ImportStreamParser = Classes.Alchemy.ImportStreamParser;
			let input = new stream.PassThrough();
			let parser = new ImportStreamParser(input, {});

			let caught = null;
			try {
				await parser.parse();
			} catch (err) {
				caught = err;
			}

			assert.strictEqual(!!caught, true, 'Should have thrown an error');
			assert.strictEqual(caught.message.includes('No model resolver'), true,
				'Error should mention no model resolver');
		});
	});

	describe('alchemy.createExportStream()', function() {

		it('should return a readable stream of the entire database', async function() {
			let exportStream = alchemy.createExportStream();

			assert.strictEqual(typeof exportStream.on, 'function', 'Should be a stream');
			assert.strictEqual(typeof exportStream.pipe, 'function', 'Should be pipeable');

			// Collect the data
			let chunks = [];
			await new Promise((resolve, reject) => {
				exportStream.on('data', chunk => chunks.push(chunk));
				exportStream.on('end', resolve);
				exportStream.on('error', reject);
			});

			let buffer = Buffer.concat(chunks);
			assert.strictEqual(buffer.length > 0, true, 'Should have exported data');
		});
	});
});
