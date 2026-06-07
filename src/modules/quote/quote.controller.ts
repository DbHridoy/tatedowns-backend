import { Request, Response, NextFunction } from "express";
import { HttpCodes } from "../../constants/status-codes";
import { QuoteService } from "./quote.service";
import { logger } from "../../utils/logger";

export class QuoteController {
  constructor(private readonly quoteService: QuoteService) { }

  createQuote = async (req: Request, res: Response, next: NextFunction) => {
    const quoteInfo = req.body;
    const user = req.user!;
    const bidSheet = req.file?.fileUrl;

    logger.info({ quoteInfo, bidSheet }, "QuoteController.createQuote line 16");

    const quote = await this.quoteService.createQuote(
      quoteInfo,
      user,
      bidSheet
    );

    res.status(HttpCodes.Ok).json({
      success: true,
      data: quote,
      message: "Quotes created successfully",
    });
  };

  getAllQuote = async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;
    const quote = await this.quoteService.getAllQuote(query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Quotes fetched successfully",
      data: quote.quote,
      total: quote.total,
    });
  };

  getQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const quote = await this.quoteService.getQuoteById(quoteId);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Quote fetched successfully",
      data: quote,
    });
  };

  updateQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const { body } = req;
    const bidSheetUrl = req.file?.fileUrl;
    const user = req.user!;
    logger.info({ body }, "QuoteController.updateQuoteById");
    const quote = await this.quoteService.updateQuoteById(
      quoteId,
      body,
      bidSheetUrl,
      user
    );
    res.status(HttpCodes.Ok).json({ quote });
  };

  deleteQuoteById = async (req: Request, res: Response, next: NextFunction) => {
    const { quoteId } = req.params;
    const quote = await this.quoteService.deleteQuoteById(quoteId);
    res.status(HttpCodes.Ok).json({ quote });
  };
}
