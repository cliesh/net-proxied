import { WindowsProxied, WindowsProxyConfig } from "./windows";

const proxied = new WindowsProxied();
const needTest = process.platform === "win32";

test("enable", () => {
  if (!needTest) return;
  const config: WindowsProxyConfig = {
    hostname: "10.20.30.40",
    port: 5060,
    types: ["http", "https", "ftp"],
    override: ["localhost", "192.168.*", "10.*"]
  };
  proxied.enable(config);
  const status = proxied.status();
  expect(status).not.toBeNull();
  expect(status!.hostname).toBe(config.hostname);
  expect(status!.port).toBe(config.port);
  expect(status!.types).toEqual(config.types);
  expect(status!.override).toEqual(config.override);
});

test("disable", () => {
  if (!needTest) return;
  proxied.disable();
  const status = proxied.status();
  expect(status).toBeNull();
});

test("enable-specify", () => {
  if (!needTest) return;
  const enableConfig: WindowsProxyConfig = {
    hostname: "10.20.30.40",
    port: 5060,
    types: ["http", "https", "ftp"],
    override: ["localhost", "192.168.*", "10.*"]
  };
  proxied.enable(enableConfig);
  proxied.disable(["http", "ftp"]);
  const status = proxied.status();
  expect(status).not.toBeNull();
  expect(status!.hostname).toBe(enableConfig.hostname);
  expect(status!.port).toBe(enableConfig.port);
  expect(status!.override).toEqual(enableConfig.override);
});
