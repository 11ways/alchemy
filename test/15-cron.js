var assert = require('assert');
let Cron;

describe('Cron', function() {

	before(() => {
		Cron = Blast.Classes.Alchemy.Cron;
	});

	describe('#parse()', function() {
		it('should parse "every minute" expression', () => {

			let cron = new Cron('* * * *');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-12 15:42:00');
		});

		it('should parse minute ranges with steps', () => {

			let cron = new Cron('1-10/5 * * *');
			let date = new Date('2023-10-12 15:59:01');

			let next_date = cron.getNextDate(date);
			assertDate(next_date, '2023-10-12 16:01:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:47:01'));
			assertDate(next_date, '2023-10-12 16:01:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:59:44'));
			assertDate(next_date, '2023-10-12 16:01:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:59:11'));
			assertDate(next_date, '2023-10-12 16:01:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:59:58'));
			assertDate(next_date, '2023-10-12 16:01:00');

			cron = new Cron('33-47/3 * * *');

			next_date = cron.getNextDate(new Date('2023-10-12 15:48:01'));
			assertDate(next_date, '2023-10-12 16:33:00');

			next_date = cron.getNextDate(new Date('2023-10-12 16:33:01'));
			assertDate(next_date, '2023-10-12 16:36:00');

			cron = new Cron('50-57/3 * * * *');

			next_date = cron.getNextDate(new Date('2023-10-12 15:50:05'));
			assertDate(next_date, '2023-10-12 15:53:00');

			cron = new Cron('*/20 * * * *');

			next_date = cron.getNextDate(new Date('2023-10-12 15:50:05'));
			assertDate(next_date, '2023-10-12 16:00:00');

			next_date = cron.getNextDate(new Date('2023-10-12 16:05:05'));
			assertDate(next_date, '2023-10-12 16:20:00');

			cron = new Cron('0-10/2 0 * * *');

			next_date = cron.getNextDate(new Date('2023-10-30 23:58:59'));
			assertDate(next_date, '2023-10-31 00:00:00');
		});

		it('should handle ranges', () => {

			let cron = new Cron('20-30 * * * *');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:10:00'));
			assertDate(next_date, '2023-10-12 15:20:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:20:00'));
			assertDate(next_date, '2023-10-12 15:21:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:29:00'));
			assertDate(next_date, '2023-10-12 15:30:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:30:00'));
			assertDate(next_date, '2023-10-12 16:20:00');

			next_date = cron.getNextDate(new Date('2023-10-12 15:59:00'));
			assertDate(next_date, '2023-10-12 16:20:00');

			cron = new Cron('0 0 5-7 * *');

			next_date = cron.getNextDate(new Date('2023-10-04 15:10:00'));
			assertDate(next_date, '2023-10-05 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-05 00:00:00'));
			assertDate(next_date, '2023-10-06 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-06 00:00:00'));
			assertDate(next_date, '2023-10-07 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-07 00:00:00'));
			assertDate(next_date, '2023-11-05 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-31 00:00:00'));
			assertDate(next_date, '2023-11-05 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-30 00:00:00'));
			assertDate(next_date, '2023-11-05 00:00:00');

			cron = new Cron('0 0 1-2 * *');

			next_date = cron.getNextDate(new Date('2023-10-30 00:00:00'));
			assertDate(next_date, '2023-11-01 00:00:00');

			next_date = cron.getNextDate(new Date('2023-11-01 00:00:00'));
			assertDate(next_date, '2023-11-02 00:00:00');

			next_date = cron.getNextDate(new Date('2023-11-02 00:00:00'));
			assertDate(next_date, '2023-12-01 00:00:00');

			cron = new Cron('1-2 0 * * *');

			next_date = cron.getNextDate(new Date('2023-10-30 00:00:00'));
			assertDate(next_date, '2023-10-30 00:01:00');

			next_date = cron.getNextDate(new Date('2023-10-30 00:01:00'));
			assertDate(next_date, '2023-10-30 00:02:00');

			next_date = cron.getNextDate(new Date('2023-10-30 00:02:00'));
			assertDate(next_date, '2023-10-31 00:01:00');

			cron = new Cron('0-1 0 * * *');

			next_date = cron.getNextDate(new Date('2023-10-30 23:58:59'));
			assertDate(next_date, '2023-10-31 00:00:00');
		});


		it('should handle specific day of month', () => {

			let cron = new Cron('0 0 31 * *');

			// Includes a DST check! At least using Europe/Brussels timezone
			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-31 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-30 15:41:31'));
			assertDate(next_date, '2023-10-31 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-31 15:41:31'));
			assertDate(next_date, '2023-12-31 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-30 23:59:59'));
			assertDate(next_date, '2023-10-31 00:00:00');
		});

		it('should handle multiple values of a specific day', () => {

			let cron = new Cron('0 0 31,24,25 * *');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-24 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-24 15:41:31'));
			assertDate(next_date, '2023-10-25 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-25 15:41:31'));
			assertDate(next_date, '2023-10-31 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-31 15:41:31'));
			assertDate(next_date, '2023-11-24 00:00:00');
		});

		it('should handle difficult expressions', () => {

			// Not even crontab.guru gets this right
			let cron = new Cron('10-30 2 12 8 0');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2029-08-12 02:10:00');

			cron = new Cron('10-30 2 12 * 0');
			next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-11-12 02:10:00');
		});

		it('should handle ranges with same start & end value', () => {

			let cron = new Cron('*/10 2-2 * * *');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-13 02:00:00');
		});

		it('should handle day of month is wildcard, month and day of week are both set', () => {

			let cron = new Cron('0 0 * 6 2');

			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2024-06-04 00:00:00');

		});

		it('should handle day-of-week of 7', () => {
			let cron = new Cron('10 2 * * 7');
			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-15 02:10:00');
		});

		it('should handle a day-of-week range & values', () => {

			let cron = new Cron('59 23 * * 2,5');
			let next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-13 23:59:00');

			next_date = cron.getNextDate(new Date('2023-10-13 23:59:00'));
			assertDate(next_date, '2023-10-17 23:59:00');

			cron = new Cron('59 23 * * 2-5');
			next_date = cron.getNextDate(new Date('2023-10-12 15:41:31'));
			assertDate(next_date, '2023-10-12 23:59:00');

			next_date = cron.getNextDate(new Date('2023-10-12 23:59:00'));
			assertDate(next_date, '2023-10-13 23:59:00');

			next_date = cron.getNextDate(new Date('2023-10-13 23:59:00'));
			assertDate(next_date, '2023-10-17 23:59:00');

			next_date = cron.getNextDate(new Date('2023-10-17 23:59:00'));
			assertDate(next_date, '2023-10-18 23:59:00');
		});

		it('should handle day of month is wildcard, month and day of week are both set', () => {

			let cron = new Cron('0 0 * 6 2');
			let next_date = cron.getNextDate(new Date('Mon, 31 May 2021 12:00:00'));
			assertDate(next_date, '2021-06-01 00:00:00');

			next_date = cron.getNextDate(new Date('2021-06-01 00:00:00'));
			assertDate(next_date, '2021-06-08 00:00:00');

			next_date = cron.getNextDate(new Date('2021-06-08 00:00:00'));
			assertDate(next_date, '2021-06-15 00:00:00');

			next_date = cron.getNextDate(new Date('2021-06-15 00:00:00'));
			assertDate(next_date, '2021-06-22 00:00:00');

			next_date = cron.getNextDate(new Date('2021-06-22 00:00:00'));
			assertDate(next_date, '2021-06-29 00:00:00');

			next_date = cron.getNextDate(new Date('2021-06-29 00:00:00'));
			assertDate(next_date, '2022-06-07 00:00:00');
		});

		it('should handle nth day of month', () => {

			let cron = new Cron('* * * * sun#2');
			let next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-08 00:00:00');

			next_date = cron.getNextDate(new Date('2023-10-09 00:00:00'));
			assertDate(next_date, '2023-11-12 00:00:00');

			next_date = cron.getNextDate(new Date('2023-11-12 00:00:00'));
			assertDate(next_date, '2023-11-12 00:01:00');

			next_date = cron.getNextDate(new Date('2023-11-13 05:00:00'));
			assertDate(next_date, '2023-12-10 00:00:00');
		});

		it('should handle last days of month', () => {

			let cron = new Cron('* * * * sunl');
			let next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-29 00:00:00');

			next_date = cron.getNextDate(new Date('2023-11-02 00:00:00'));
			assertDate(next_date, '2023-11-26 00:00:00');

			cron = new Cron('* * * * satl');
			next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-28 00:00:00');

			cron = new Cron('* * * * wedl');
			next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-25 00:00:00');

			cron = new Cron('* * * * tuel');
			next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-31 00:00:00');

			// Last saturday
			cron = new Cron('* * * * 6L');
			next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-28 00:00:00');
		});

		it('should parse last weekday of month', () => {

			let cron = new Cron('* * LW *');
			let next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-31 00:00:00');

			next_date = cron.getNextDate(new Date('2023-11-02 00:00:00'));
			assertDate(next_date, '2023-11-30 00:00:00');

			next_date = cron.getNextDate(new Date('2024-03-02 00:00:00'));
			assertDate(next_date, '2024-03-29 00:00:00');
		});

		it('should parse the last day of the month', () => {

			let cron = new Cron('* * L *');
			let next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-31 00:00:00');

			next_date = cron.getNextDate(new Date('2024-03-02 00:00:00'));
			assertDate(next_date, '2024-03-31 00:00:00');
		});

		it('should match every nth day of a week', () => {

			let cron = new Cron('30 12 * * */4');
			let next_date = cron.getNextDate(new Date('2023-10-13 12:58:00'));
			assertDate(next_date, '2023-10-15 12:30:00');

			next_date = cron.getNextDate(new Date('2023-10-15 12:30:00'));
			assertDate(next_date, '2023-10-19 12:30:00');

		});
	});

	describe('#matches(date)', () => {

		it('should return true or false whether the date matches the cron', () => {

			let cron = new Cron('* * * *');
			let matches = cron.matches(new Date('2023-10-12 15:41:31'));

			assert.strictEqual(matches, true);

			cron = new Cron('* * L *');
			assert.strictEqual(cron.matches(new Date('2023-10-31 00:00:00')), true);
			assert.strictEqual(cron.matches(new Date('2023-10-31 00:10:11')), true);
			assert.strictEqual(cron.matches(new Date('2023-10-30 00:10:11')), false);

			cron = new Cron('* * * * tuel');
			assert.strictEqual(cron.matches(new Date('2023-10-02 00:00:00')), false);
			assert.strictEqual(cron.matches(new Date('2023-10-31 00:00:00')), true);

			cron = new Cron('59 23 * * 2,5');
			assert.strictEqual(cron.matches(new Date('2023-10-12 15:41:31')), false);
			assert.strictEqual(cron.matches(new Date('2023-10-13 23:59:00')), true);
			assert.strictEqual(cron.matches(new Date('2023-10-13 23:59:01')), true);
		});
	});

	describe('#toDry()', () => {
		it('can be serialized', () => {

			let cron = new Cron('* * L *');
			let next_date = cron.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-31 00:00:00');

			let serialized = JSON.dry(cron);
			let revived = JSON.undry(serialized);

			next_date = revived.getNextDate(new Date('2023-10-02 00:00:00'));
			assertDate(next_date, '2023-10-31 00:00:00');
		});
	});
});

function assertDate(actual, expected) {

	if (actual === false) {
		throw new Error('Failed to find next Cron date, expected "' + expected + '"');
	}

	assert.strictEqual(actual.format('Y-m-d H:i:s'), expected);
}