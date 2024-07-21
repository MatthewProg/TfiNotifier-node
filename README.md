<h1 align="center">TFI Notifier</h1>

<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#technical-overview">Technical overview</a></li>
    <li>
      <a href="#application-setup">Application setup</a>
      <ul>
        <li><a href="#environmental-variables">Environmental variables</a></li>
        <li><a href="#local-setup">Local setup</a></li>
      </ul>
    </li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

## About

TFI Notifier is a simple Node application that scrapes fund data from the [inPZU](https://inpzu.pl/tfi/kup-lista-funduszy/index) website, summarises it, and sends a daily report. It helps you better track your investments and lets you know if the indexes are falling.

## Technical overview

The application is hosted on the [Vercel](https://vercel.com/) platform as a serverless function and is triggered every day by a CRON job.
Normally, this kind of application would probably just call a backend API to get the required data, but unfortunately, in this case, it was not possible. To bypass API security, the notifier is using the [`puppeteer-core`](https://www.npmjs.com/package/puppeteer-core) package to run the chromium instance and scrape the data out of it.
After processing the gathered data, it is sent to the end-user's email via the [Resend](https://resend.com/) service.

## Application setup

### Environmental variables

Values used to control the behaviour of the application.

|Name|Description|Example|
|---|---|---|
|`RESEND_KEY`|API key to authenticate the requests|`re_dE...`|
|`CRON_SECRET`|Random key to restrict the function triggering|`c0Af...`|
|`Email_Recipient`|Email of the user to receive the report|`test@example.com`|
|`Fund_{key}_Url`|Url to the index graph, where the data could be scrapped from|`https://inpzu.pl/tfi/karta-funduszu/INPZU_AA/O`|
|`Fund_{key}_Ref`|Reference value of the fund to calculate gain/loss|`102.13`|
> `key` can be any value that does not contain underscores ('`_`').

### Local setup

1. Clone the repository.
2. Run `npm install` (originally used Node 18).
3. Install Vercel CLI (`npm i -g vercel@latest`).
4. Run `npm run run-local`.
5. Follow the Vercel CLI steps.
6. Add environmental variables on the Vercel website.

## [License](/./LICENSE)

```
MIT License

Copyright (c) 2024 Mateusz Ciągło

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```