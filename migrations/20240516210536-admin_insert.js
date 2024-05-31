const bcryptjs = require('bcryptjs');
const dayjs = require('dayjs');

const rootAdminBaseData = {
	username: 'DEV_Admin',
	firstName: 'Developer',
	lastName: 'Admin',
	email: 'dev-admin@music-lab.io',
	picture: 'https://lh3.googleusercontent.com/a/ACg8ocI1sWm2ivpaOXJsxPq9XQPV4T_XWSMxzs5qIM5O0DvTVO4idCS0=s96-c',
	institution: {
		name: 'Singapore University of Technology and Design',
		type: 'university',
	},
	xp: 0,
	earTrainingProfile: {
		currentStreak: {
			count: 0,
			startDate: new Date(),
			lastLogDate: new Date(),
		},
		goals: [
			{ exerciseType: 'interval-identification', target: 10 },
			{ exerciseType: 'chord-identification', target: 10 },
			{ exerciseType: 'mode-identification', target: 10 },
		],
		stats: {
			totalSessions: 0,
			totalDuration: 0,
		},
	},
};

const rootAdminRawPassword = 'dev__Admin123$';

module.exports = {
	async up(db) {
		const systemUserCollection = db.collection('music_lab_app.users');

		const rootAdminUserExists = (await systemUserCollection.findOne({ email: rootAdminBaseData.email })) !== null;

		if (rootAdminUserExists) {
			console.info('>>> WARN: Root admin already inserted.\n');
			process.exit();
		}

		const salt = await bcryptjs.genSalt(10);
		const rootAdminHashedPassword = await bcryptjs.hash(rootAdminRawPassword, salt);

		const rootAdminInsertion = await systemUserCollection.insertOne({
			...rootAdminBaseData,
			password: rootAdminHashedPassword,
			createdAt: dayjs().toDate(),
			updatedAt: dayjs().toDate(),
		});

		if (rootAdminInsertion.acknowledged) {
			console.info('>>> INFO: Root admin inserted.\n', {
				...rootAdminBaseData,
				password: rootAdminRawPassword,
			});
		} else {
			console.info('>>> ERROR: Could not insert root admin.\n');
		}
	},
	async down(db) {
		const systemUserCollection = db.collection('music_lab_app.users');

		const rootAdminUserExists = (await systemUserCollection.findOne({ email: rootAdminBaseData.email })) !== null;

		if (!rootAdminUserExists) {
			console.info('>>> WARN: Root admin not inserted.\n');
			process.exit();
		}

		const rootAdminDeletion = await systemUserCollection.deleteOne({ email: rootAdminBaseData.email });

		if (rootAdminDeletion.acknowledged) {
			console.info('>>> Admin user deleted\n', rootAdminDeletion);
		} else {
			console.info('>>> WARN: Could not insert root admin.\n');
		}
	},
};
