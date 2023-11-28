import { Document, model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

import { UserDocument } from '../user/user.model';

export enum EarTrainingPracticeType {
	IntervalIdentification = 'interval-identification',
	ChordIdentification = 'chord-identification',
	ModeIdentification = 'mode-identification',
}

export enum PlayingMode {
	Harmonic = 'harmonic',
	Ascending = 'ascending',
	Descending = 'descending',
	AscendingAndDescending = 'ascending-descending',
}

interface EarTrainingPracticeResultDetail {
	score: number;
	correct: number;
	incorrect: number;
	questionCount: number;
}

interface EarTrainingPracticeStatisticsDetail extends EarTrainingPracticeResultDetail {
	questionType: string;
}

export interface IEarTrainingPracticeSession {
	type: EarTrainingPracticeType;
	userId: UserDocument['id'];
	duration: number;
	result: EarTrainingPracticeResultDetail;
	statistics: Types.Array<EarTrainingPracticeStatisticsDetail>;
	createdAt: Date;
}

export interface EarTrainingPracticeSessionDocument extends IEarTrainingPracticeSession, Document {}

const earTrainingPracticeSessionSchema = new Schema<IEarTrainingPracticeSession>(
	{
		type: {
			type: String,
			enum: Object.values(EarTrainingPracticeType),
			required: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'users',
		},
		duration: {
			type: Number,
			required: true,
		},
		result: {
			type: {
				score: Number,
				correct: Number,
				incorrect: Number,
				questionCount: Number,
			},
			required: true,
			_id: false,
		},
		statistics: {
			type: [
				{
					score: Number,
					correct: Number,
					incorrect: Number,
					questionCount: Number,
					questionType: String,
				},
			],
			required: true,
			_id: false,
		},
	},
	{
		timestamps: {
			createdAt: true,
			updatedAt: false,
		},
	}
);

earTrainingPracticeSessionSchema.plugin(mongoosePaginate);
earTrainingPracticeSessionSchema.index({ type: 1 });
earTrainingPracticeSessionSchema.index({ userId: 1 });
earTrainingPracticeSessionSchema.index({ createdAt: 1 });

const EarTrainingPracticeSession = model<IEarTrainingPracticeSession, PaginateModel<EarTrainingPracticeSessionDocument>>('ear_training.practice_session', earTrainingPracticeSessionSchema);

export default EarTrainingPracticeSession;
