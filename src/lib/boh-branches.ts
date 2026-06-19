// Branch Registry for the Chiang Mai BOH Public Reporting API.
//
// Each branch is a SEPARATE deployment (its own DB, URL and API key) — there is
// no combined endpoint. We fetch each branch individually using the key stored
// in its env var. Adding a new branch in the future = add ONE row here and set
// its key env var (no code change needed elsewhere).
//
// Keys are NEVER hard-coded — they are read from process.env[keyEnv] at request
// time on the server. See .env.example for the variable names.

export type BohBranch = {
  id: string;
  name: string; // full display name, e.g. "Chiang Mai Park Lawn"
  short: string; // short label, e.g. "Park Lawn"
  baseUrl: string; // no trailing slash
  keyEnv: string; // name of the env var holding this branch's API key
};

export const BOH_BRANCHES: BohBranch[] = [
  {
    id: "mississauga",
    name: "Chiang Mai Mississauga",
    short: "Mississauga",
    baseUrl: "https://www.sujeevan.ca",
    keyEnv: "BOH_KEY_MISSISSAUGA",
  },
  {
    id: "yorkmills",
    name: "Chiang Mai York Mills",
    short: "York Mills",
    baseUrl: "https://yorkmills.sujeevan.ca",
    keyEnv: "BOH_KEY_YORKMILLS",
  },
  {
    id: "parklawn",
    name: "Chiang Mai Park Lawn",
    short: "Park Lawn",
    baseUrl: "https://parklawn.sujeevan.ca",
    keyEnv: "BOH_KEY_PARKLAWN",
  },
];

export function getBranch(id: string): BohBranch | undefined {
  return BOH_BRANCHES.find((b) => b.id === id);
}
