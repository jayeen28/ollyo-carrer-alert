require('dotenv').config();
const api = require("./api_fetch.js");
const { JSDOM } = require('jsdom');
const notifier = require('node-notifier');
const mail = require("./mail");
const keywords = (process.env.KEYWORDS || '').split(',');

async function main() {
    while (true) {
        try {
            const res = await api();
            const { success, data: { html } } = await res.json();
            if (!success && typeof html !== 'string' && !html) throw new Error('Empty response from olio');
            console.log('Data received from ollyo');
            const dom = new JSDOM(html);
            const document = dom.window.document;
            const jobTitles = [];

            // get job titles
            const openings = document.getElementsByClassName('openings')?.[0];
            if (!openings) throw new Error('Openings not found');
            for (let e of openings.children) {
                const titles = e.getElementsByClassName('opening-title') || [];
                for (let title of titles) {
                    jobTitles.push((title.textContent || '').trim().toLowerCase());
                }
            }

            // check keyword exists
            for (let title of jobTitles) {
                if (keywords.some(k => title.includes(k))) {
                    mail({ to: process.env.EMAIL_FOR_ALERT, subject: 'Ollyo is hiring', text: `Found keyword match at ollyo. Job title ${title}` });
                    notifier.notify({
                        title: 'Ollyo is hiring',
                        message: `Found keyword match on ollyo job title ${title}`
                    });
                }
            }
        }
        catch (e) {
            console.log(e);
        }
        // sleep
        await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
    }
}
main();