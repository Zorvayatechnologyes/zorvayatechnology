ZORVAYA TECHNOLOGY - PORTFOLIO WEBSITE
======================================

LIVE SITE
  https://anubhav0808-uv.github.io/zorvayatechnology/

ADMIN DASHBOARD
  https://anubhav0808-uv.github.io/zorvayatechnology/#/admin

FILES
  index.html   - the page shell
  styles.css   - transparent / glass theme (light and dark)
  app.js       - the app: public site + admin dashboard (talks to Supabase)
  logo.png     - your logo, used in the header and the hero
  favicon.png  - the small icon shown in the browser tab
  apple-touch-icon.png - icon used when the site is saved to a phone home screen

ADMIN LOGIN
  Admin email registered in the database: anubhavraj1969@gmail.com
  First time: open the admin URL, click "Create your admin account", sign up
  with that email, and confirm the verification email Supabase sends.
  Alternative: in the Supabase dashboard go to Authentication > Users >
  Add user, enter that email and a password, and tick "Auto Confirm User".

WHAT THE ADMIN CAN DO
  - Add new projects
  - Edit any existing project
  - Remove projects
  - Read every message a client sends from the contact form
  - Update the site name, tagline, about text, email, phone, WhatsApp and socials

HOW IT WORKS
  Visitors can only view projects and send a message. Only the admin email can
  add or remove projects, enforced by row-level security in Supabase, so the
  site stays secure even though it is served as plain static files.

HOSTING IT YOURSELF
  Any static host works. Upload the three files (index.html, styles.css, app.js).
  Netlify Drop: https://app.netlify.com/drop
  To point it at your own Supabase project, edit the two values at the top of
  app.js: SUPABASE_URL and SUPABASE_ANON.

NOTES
  The Supabase anon key in app.js is meant to be public. Your data is protected
  by the database policies, not by hiding the key.
