import { connect, connection, connections, Mongoose } from 'mongoose';

let cachedMongoConnenction: Mongoose | null = null;

connection
	.on('error', error => {
		console.log('Error: connection to DB failed 🔗❌', error);
	})
	.on('close', () => {
		console.log('Error: Connection to DB lost 🔗❌');
	})
	.once('open', () => {
		connections.map(({ host, port, name }) => console.log(`Connected to ${host}:${port}/${name} 🔗✅`));
	});

const connectDB = async () => {
	if (cachedMongoConnenction === null) {
		cachedMongoConnenction = await connect((process.env.MONGODB_URI as string) ?? '');
	} else {
		console.log('MongoDB: Using cached database instance 🔗✅');
	}
};

export default connectDB;
