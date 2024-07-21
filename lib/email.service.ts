import { FundStats } from "./fund-stats.model.js";
import { Resend } from "resend";

const cellStyles = 'border: 1px solid black;padding: 4px;';

export async function sendStats(stats: FundStats[]) {
    const emailRecipient = process.env.Email_Recipient;
    if (!emailRecipient) {
        console.error('Email recipient is not defined!');
        throw new Error('Email recipient is not defined!');
    }

    const emailSubject = getEmailSubject(stats);
    const emailBody = generateEmail(stats);

    const resendKey = process.env.RESEND_KEY;
    if (!resendKey) {
        console.error('Resend key is not defined!');
        throw new Error('Resend key is not defined!');
    }

    const resend = new Resend(resendKey);

    console.log('Sending email to: ', emailRecipient);
    await resend.emails.send({
        from: 'tfi-notifier@resend.dev',
        to: emailRecipient,
        subject: emailSubject,
        html: emailBody
    });
}

function getEmailSubject(stats: FundStats[]): string {
    const defaultSubject = '[TFI Notifier] Funds report';

    if (stats.every(x => (x.refChange ?? 0.0) < 1.0))
        return `[CRITICAL]${defaultSubject}`;

    if (stats.some(x => x.refChange && x.refChange < 0.0)
        || stats.some(x => x.last7days && x.last7days < -5.0)
        || stats.some(x => x.last30days && x.last30days < -8.0))
        return `[URGENT]${defaultSubject}`;

    if (stats.some(x => x.refChange && x.refChange < 2.0)
        || stats.some(x => x.last7days && x.last7days < 3.0)
        || stats.some(x => x.last30days && x.last30days < -5.0))
        return `[WARNING]${defaultSubject}`;

    return defaultSubject;
}

function generateEmail(stats: FundStats[]): string {
    const table = generateTable(stats.sort((a, b) => a.id.localeCompare(b.id)));

    return `
        <html lang="en">
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <h2>Funds index</h2>
                ${table}
            </body>
        </html>`;
}

function generateTable(stats: FundStats[]): string {
    const statRows = stats.map(x => `
        <tr>
            ${generateCell(x.id)}
            ${generateCell(x.name ?? '')}
            ${generateCell(x.lastUpdated?.toLocaleDateString('en-GB', {timeZone: 'Europe/Warsaw'}) ?? '')}
            ${generateValue(x.last1day)}
            ${generateValue(x.last3days)}
            ${generateValue(x.last7days)}
            ${generateValue(x.last30days)}
            ${generateValue(x.last90days)}
            ${generateValue(x.last180days)}
            ${generateValue(x.refChange)}
            ${generateCell(`<a href="${x.url}" target="_blank">Link</a>`)}
        </tr>`);

    return `
        <table style="border:1px solid black;border-spacing: 0;">
            <tr>
                ${generateHeader('ID')}
                ${generateHeader('Name')}
                ${generateHeader('Updated')}
                ${generateHeader('1 day')}
                ${generateHeader('3 days')}
                ${generateHeader('7 days')}
                ${generateHeader('30 days')}
                ${generateHeader('90 days')}
                ${generateHeader('180 days')}
                ${generateHeader('Reference')}
                ${generateHeader('Link')}
            </tr>
            ${statRows}
            <tr>
                ${generateCell('-')}
                ${generateCell('Avg. change')}
                ${generateCell('-')}
                ${generateValue(stats.map(x => x.last1day ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.last3days ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.last7days ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.last30days ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.last90days ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.last180days ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateValue(stats.map(x => x.refChange ?? 0.0).reduce((prev, curr) => prev + curr) / stats.length)}
                ${generateCell('-')}
            </tr>
        </table>`;
}

function generateHeader(text: string): string {
    return `<th style="${cellStyles}">${text}</th>`;
}

function generateCell(text: string): string {
    return `<td style="${cellStyles}">${text}</td>`;
}

function generateValue(change?: number): string {
    const value = change ?? 0.0;
    const color = value > 0 ? 'limegreen' :
                  value < 0 ? 'red' :
                  'unset';
    const valueStr = value.toLocaleString('en-GB', { style: 'percent', minimumFractionDigits: 3});
    return `<td style="color: ${color};${cellStyles}">${valueStr}</td>`;
}