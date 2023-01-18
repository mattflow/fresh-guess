import puppeteer from "puppeteer";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const RottenTomatoesSchema = z.object({
  thirdParty: z.object({
    algoliaSearch: z.object({
      aId: z.string(),
      sId: z.string(),
    }),
  }),
});

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure.query(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.rottentomatoes.com/");
    const result = await page.evaluate(() => {
      // @ts-expect-error This function will be evaluated on the rotten tomatoes website
      return RottenTomatoes;
    });
    await browser.close();
    const data = RottenTomatoesSchema.parse(result);
    return data.thirdParty.algoliaSearch;
  }),
});
