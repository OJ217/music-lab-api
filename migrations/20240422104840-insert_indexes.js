module.exports = {
	async up(db) {
		const userCollection = db.collection('music_lab_app.users');
		const earTrainingSessionCollection = db.collection('music_lab_app.ear_training_sessions');
		const earTrainingProfileCollection = db.collection('music-lab-app.ear_training_profiles');

		await userCollection.createIndex({ email: 1 }, { unique: true });
		await earTrainingSessionCollection.createIndex({ userId: 1 });
		await earTrainingProfileCollection.createIndex({ userId: 1 });
	},

	async down(db) {
		const userCollection = db.collection('music_lab_app.users');
		const earTrainingSessionCollection = db.collection('music_lab_app.ear_training_sessions');
		const earTrainingProfileCollection = db.collection('music-lab-app.ear_training_profiles');

		await userCollection.dropIndex('email_1');
		await earTrainingSessionCollection.dropIndex('userId_1');
		await earTrainingProfileCollection.dropIndex('userId_1');
	},
};
