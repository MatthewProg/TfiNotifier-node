import Chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core"

export async function getBrowser(): Promise<Browser> {
    const isProduction = process.env.NODE_ENV === 'production';

    const browser = await puppeteer.launch(
        isProduction ? {
          args: Chromium.args,
          defaultViewport: Chromium.defaultViewport,
          executablePath: await Chromium.executablePath(),
          ignoreHTTPSErrors: true,
          headless: 'new'
        } : {
          headless: 'new',
          executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      });

    return browser;
}