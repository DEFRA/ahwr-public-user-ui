import { initAll } from "govuk-frontend";
import { initAll as initMoj } from "@ministryofjustice/frontend";
import "./css/application.scss";
import "./css/document-list.scss";
import "./css/devolved-nations.scss";
import "./css/contents-list.scss";
import "./css/print-link.scss";
import "./css/govspeak.scss";
import "./css/organisation-logo.scss";
import "./js/cookies.js";
import "./js/handleDuplicateFormSubmissions.js";
import jquery from "jquery";

initAll();
initMoj();

window.$ = jquery;
