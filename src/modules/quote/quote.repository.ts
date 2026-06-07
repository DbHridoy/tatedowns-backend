import { buildDynamicSearch } from "../../utils/dynamic-search-utils";
import { Quote } from "./quote.model";

export class QuoteRepository {
  createQuote = async (quoteInfo: object) => {
    const newQuote = new Quote(quoteInfo);
    return newQuote.save();
  };

  countQuotesByClientId = async (clientId: string) => {
    return Quote.countDocuments({ clientId });
  };

  getAllQuotes = async (query: any) => {
    const { filter, search, options } = buildDynamicSearch(Quote, query);
    const [quote, total] = await Promise.all([
      Quote.find({ ...filter, ...search }, null, options).populate([{
        path: "clientId"
      }]),
      Quote.countDocuments({ ...filter, ...search }),
    ]);
    return { quote, total };
  };

  getQuoteById = async (id: string) => {
    return await Quote.findById(id).populate([{
      path: "clientId",
      populate: {
        path: "salesRepId"
      }
    }, {
      path: "notes"
    }]);
  };

  updateQuoteById = async (id: string, quoteInfo: object) => {
    return await Quote.findByIdAndUpdate(id, quoteInfo, { new: true }).populate(["notes"]);
  };

  updateQuoteStatus = async (id: string, status: string) => {
    return await Quote.findByIdAndUpdate(id, { status }, { new: true });
  }

  deleteQuoteById = async (id: string) => {
    return await Quote.findByIdAndDelete(id);
  };
}
