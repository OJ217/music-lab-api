import { ClientSession, ClientSessionOptions, Db, DbOptions, MongoClient, MongoClientOptions } from 'mongodb';
import { default as MongoModelClient } from 'papr';

class MongoService {
	private uri: string;
	private db: string;
	private mongoClient: MongoClient;
	public clientConnected: boolean = false;

	constructor(uri: string, db: string, options?: MongoClientOptions) {
		this.uri = uri;
		this.db = db;
		this.mongoClient = new MongoClient(this.uri, options);

		this.mongoClient.on('open', () => {
			this.clientConnected = true;
		});

		this.mongoClient.on('close', () => {
			this.clientConnected = false;
		});

		this.mongoClient.on('serverClosed', () => {
			this.clientConnected = false;
		});

		this.mongoClient.on('topologyClosed', () => {
			this.clientConnected = false;
		});

		this.mongoClient.on('connectionClosed', () => {
			this.clientConnected = false;
		});

		this.mongoClient.on('connectionPoolClosed', () => {
			this.clientConnected = false;
		});
	}

	public async connect() {
		await this.mongoClient.connect();
	}

	public async disconnect(force?: boolean): Promise<void> {
		await this.mongoClient.close(force ?? false);
	}

	public getDb(name?: string, dbOptions?: DbOptions): Db {
		return this.mongoClient.db(name ?? this.db, dbOptions);
	}

	public startSession(sessionOptions?: ClientSessionOptions): ClientSession {
		if (!sessionOptions) {
			return this.mongoClient.startSession();
		} else {
			return this.mongoClient.startSession(sessionOptions);
		}
	}
}

const mongoInstance = new MongoService(process.env.MONGO_URI as string, process.env.MONGO_DB as string);
export const mongoModelClient = new MongoModelClient();

export const connectDB = async () => {
	if (!mongoInstance.clientConnected) {
		await mongoInstance.connect();
		console.info('MongoDB: Creating new database connection 🔗✅');
		mongoModelClient.initialize(mongoInstance.getDb());
		await mongoModelClient.updateSchemas();
	} else {
		console.info('MongoDB: Using cached database instance 🔗✅');
	}
};
