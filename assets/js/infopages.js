/* About, Contact, Privacy and Terms pages, shared by the browser
 * (window.TG_INFO) and the server SSR (require), so the server HTML and the
 * app always show the same text. Each page has { title, desc, eyebrow, h1, html }.
 * When the text of a page changes, update its UPDATED date below. */
(function (root) {
  const EMAIL = "timegridfc@gmail.com";
  const YT = "https://www.youtube.com/@timegrid_fc";
  const UPDATED = "13 November 2026";
  const mail = `<a href="mailto:${EMAIL}">${EMAIL}</a>`;

  const PAGES = {
    about: {
      title: "About Us",
      desc: "About Time Grid FC — an independent football news and analysis site, and the companion to the Time Grid FC YouTube channel.",
      eyebrow: "About Us",
      h1: "About Time Grid FC",
      html: `
      <p>Time Grid FC is an independent football website and the companion to the <a href="${YT}" target="_blank" rel="noopener">Time Grid FC YouTube channel</a>, where we publish match analysis, player breakdowns and football news.</p>
      <p>The site brings that work together in one place: daily football news, match previews and reports, transfer stories, tactical explainers, the history of the FIFA World Cup, and every video from the channel.</p>

      <h2>Who runs this site</h2>
      <p>Time Grid FC is run by the same small team that makes the YouTube channel. We are football fans who follow the Premier League, La Liga, the Bundesliga, Serie A, the Champions League and international football every week. We are not affiliated with, endorsed by, or officially connected to any club, league or governing body. Club and competition names are used only to identify them.</p>

      <h2>How we write our articles</h2>
      <ul>
        <li><b>News</b> is based on official club and federation statements and on reporting by established outlets. When a story was first reported by another outlet, we name that outlet in the article.</li>
        <li><b>Previews, match reports and analysis</b> add our own view: what happened, why it matters and what it means for the next game.</li>
        <li>We keep reporting and opinion apart, and we mark predictions and opinions as ours.</li>
        <li>We do not publish betting tips or odds-based advice.</li>
      </ul>

      <h2>Corrections</h2>
      <p>Football news moves fast and we sometimes get things wrong. If you spot an error, tell us through the <a href="/contact">Contact page</a> or at ${mail}. We check every report and correct mistakes as quickly as we can.</p>

      <h2 id="media-credits">Images and media</h2>
      <p>We only want to use images we have the right to use: our own graphics, stills from our own videos, free-licence images (for example from <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a> and <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>), and <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> photos credited as their licence requires. Video thumbnails belong to their owners and are shown only to link to the original videos on YouTube.</p>
      <p><b>If you own an image or text on this site and did not give permission for it to be used, email ${mail} with a link to the page. We will remove it, normally within 48 hours.</b></p>

      <h2>Contact</h2>
      <p>Story tips, corrections or questions: use our <a href="/contact">Contact page</a> or email ${mail}.</p>`,
    },

    contact: {
      title: "Contact Us",
      desc: "Contact the Time Grid FC team for story tips, corrections, feedback, image or copyright requests, and general enquiries.",
      eyebrow: "Contact Us",
      h1: "Get in touch",
      html: `
      <p>We'd love to hear from you. Write to us about:</p>
      <ul>
        <li><b>Corrections</b>: something in an article is wrong or out of date.</li>
        <li><b>Story tips</b> and suggestions for analysis or videos.</li>
        <li><b>Image or copyright requests</b>: you own something on the site and want it credited or removed.</li>
        <li><b>Feedback</b>, partnerships or anything else.</li>
      </ul>
      <p><b>Email:</b> ${mail}<br>
         <b>YouTube:</b> <a href="${YT}" target="_blank" rel="noopener">@timegrid_fc</a></p>
      <p>We usually reply within 48 hours.</p>
      <h2>Send us a message</h2>
      <form class="card" style="padding:1.4rem;max-width:520px" id="contact-form" novalidate>
        <div class="field"><label for="cf-name">Name</label><input class="input" id="cf-name" name="name" maxlength="80" autocomplete="name" required></div>
        <div class="field"><label for="cf-email">Email</label><input class="input" id="cf-email" name="email" type="email" maxlength="120" autocomplete="email" required></div>
        <div class="field"><label for="cf-topic">Topic</label><select class="select" id="cf-topic" name="topic">
          <option>General</option><option>Correction</option><option>Story tip</option><option>Image or copyright</option><option>Partnership</option>
        </select></div>
        <div class="field"><label for="cf-msg">Message</label><textarea class="textarea" id="cf-msg" name="message" minlength="10" maxlength="4000" required></textarea></div>
        <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="help" id="cf-status" role="status" style="min-height:1.2em"></p>
        <button class="btn" type="submit">Send message</button>
      </form>
      <p class="muted" style="font-size:.85rem">We use what you send only to reply to you. See our <a href="/privacy">Privacy Policy</a>.</p>`,
    },

    privacy: {
      title: "Privacy Policy",
      desc: "How Time Grid FC collects, uses and protects your information, including cookies, Google Analytics and Google AdSense advertising.",
      eyebrow: "Legal",
      h1: "Privacy Policy",
      html: `
      <p class="muted">Last updated: ${UPDATED}</p>
      <p>This Privacy Policy explains how Time Grid FC ("we", "us", "our") collects, uses and protects information when you visit timegridfc.com. By using the site, you agree to the practices described here.</p>

      <h2>Information we collect</h2>
      <p><b>Account information.</b> If you create an account, we store the name and email address you give us and an encrypted (hashed) version of your password.</p>
      <p><b>Comments.</b> Comments you post on articles are stored and shown with the name you choose.</p>
      <p><b>Contact messages.</b> If you use our contact form, we receive your name, email address and message, and use them only to reply to you.</p>
      <p><b>Usage and log data.</b> Like most websites, our servers record standard information such as your browser type, device, approximate location derived from your IP address, the page that referred you, and the pages you view.</p>

      <h2>Cookies</h2>
      <p>We use cookies and similar browser storage to keep you signed in, remember preferences such as your light or dark theme and your cookie choice, measure how the site is used (Google Analytics) and, where enabled, serve ads (Google AdSense). You can delete or block cookies in your browser settings; some features may not work without them.</p>
      <p>When you first visit, a cookie notice lets you accept or decline. If you click <b>Decline</b>, Google Analytics does not set analytics cookies on your device.</p>

      <h2>Google Analytics</h2>
      <p>We use Google Analytics 4, a service from Google LLC, to understand how visitors use the site, for example which pages are read, how long visits last, which device and browser are used, roughly which country or city visitors come from, and how they found us. Google Analytics uses cookies (such as <code>_ga</code>) for this. We use these reports only in aggregate to improve the site; we do not use them to identify you.</p>
      <ul>
        <li>Google Analytics 4 does not log or store IP addresses.</li>
        <li>You can stop Google Analytics on all websites with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out browser add-on</a>.</li>
        <li>Learn more in <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses information from sites that use its services</a>.</li>
      </ul>

      <h2>Advertising (Google AdSense)</h2>
      <p>We use or may use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your previous visits to this and other websites.</p>
      <ul>
        <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
        <li>You can opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
        <li>You can opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener">aboutads.info</a>.</li>
      </ul>
      <p>Where the law requires it, for example for visitors in the European Economic Area, the United Kingdom and Switzerland, we ask for your consent before personalised ads are shown, using Google's consent message.</p>

      <h2>Third-party links and media</h2>
      <p>This site links to other websites (such as YouTube) and shows media from third parties (see <a href="/about#media-credits">Images and media</a>). We are not responsible for the content or privacy practices of other websites.</p>

      <h2>Children's privacy</h2>
      <p>This site is not directed at children under 13, and we do not knowingly collect personal information from them.</p>

      <h2>Your rights</h2>
      <p>You can ask us to show, correct or delete the personal information linked to your account or messages by contacting us. Depending on where you live, laws such as the GDPR or CCPA may give you further rights.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy from time to time. Changes are posted on this page with a new "last updated" date.</p>

      <h2>Contact</h2>
      <p>Questions about this policy? Email ${mail} or use our <a href="/contact">Contact page</a>.</p>`,
    },

    terms: {
      title: "Terms & Disclaimer",
      desc: "The terms of use and content disclaimer for the Time Grid FC website.",
      eyebrow: "Legal",
      h1: "Terms of Use &amp; Disclaimer",
      html: `
      <p class="muted">Last updated: ${UPDATED}</p>
      <p>By accessing and using Time Grid FC, you accept these terms. If you do not agree, please do not use the site.</p>

      <h2>Content and accuracy</h2>
      <p>All articles are provided for general information, analysis and entertainment. While we work for accuracy, football news changes quickly and we make no warranty that all content is complete, current or error-free. Nothing on this site is professional or betting advice.</p>

      <h2>Intellectual property</h2>
      <p>Original editorial content on this site belongs to Time Grid FC. Club names, competition names and trademarks remain the property of their owners and are used only to identify them. If you believe something on this site uses your work without permission, see <a href="/about#media-credits">Images and media</a> and contact us; we will remove it promptly.</p>

      <h2>Comments</h2>
      <p>You are responsible for comments you post. Do not post unlawful, abusive, misleading or infringing content. We may moderate, edit or remove comments at our discretion.</p>

      <h2>External links</h2>
      <p>This site contains links to third-party websites, including YouTube. We are not responsible for the content, policies or availability of those sites.</p>

      <h2>Limitation of liability</h2>
      <p>The site is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Time Grid FC is not liable for any loss or damage arising from your use of the site.</p>

      <h2>Changes</h2>
      <p>We may update these terms at any time; continuing to use the site means you accept the updated terms.</p>

      <h2>Contact</h2>
      <p>Questions? Email ${mail}.</p>`,
    },
  };

  const api = { PAGES, EMAIL, UPDATED };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TG_INFO = api;
})(typeof window !== "undefined" ? window : this);
