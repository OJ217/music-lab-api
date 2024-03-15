import { FindOptions } from 'mongodb';
import { BaseSchema, Model, PaprFilter, Projection, SchemaOptions } from 'papr';

type SchemaType<ModelType> = ModelType extends Model<infer TSchema, any> ? TSchema : never;

export class PaginationService<M extends Model<S, SchemaOptions<S>>, S extends BaseSchema = SchemaType<M>> {
	constructor(private model: M) {}

	public async paginate(
		filter: PaprFilter<S>,
		paginationOptions?: {
			page: number;
			limit: number;
		},
		options?: Omit<FindOptions<S>, 'projection' | 'skip' | 'limit'> & {
			projection?: Projection<S>;
			page?: number;
			limit?: number;
		}
	) {
		const page = paginationOptions?.page ?? 1;
		const limit = paginationOptions?.limit ?? 10;

		const totalDocs = await this.model.countDocuments(filter, options);
		const totalPages = Math.ceil(totalDocs / limit);

		const docs = await this.model.find(filter, {
			skip: (page - 1) * limit,
			limit: limit,
			...options,
		});

		return {
			docs,
			totalDocs,
			totalPages,
			page: page,
			limit: limit,
			offset: (page - 1) * limit,
			pagingCounter: (page - 1) * limit + 1,
			hasPrevPage: page > 1,
			hasNextPage: page < totalPages,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: page < totalPages ? page + 1 : null,
		};
	}
}
