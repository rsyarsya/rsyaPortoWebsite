export const contactFormEnabled = (mode?: string) => mode !== 'email-link';
export const CONTACT_FORM_ENABLED = contactFormEnabled(import.meta.env.PUBLIC_CONTACT_MODE);
