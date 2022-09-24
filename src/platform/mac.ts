import { BaseProxyConfig } from "../base-proxy-config";
import { Executor } from "../executor";

export type MacProxyType = "web" | "secureweb" | "ftp" | "socksfirewall" | "gopher" | "streaming";

export class MacProxyConfig implements BaseProxyConfig {
  hostname: string;
  port: number;
  override?: string[];
  authentification?: Authentication;

  /**
   * network service name
   *
   * default: ["Wi-Fi", "Ethernet"]
   */
  networkServiceNames: string[];

  /**
   * proxy type
   *
   * default: ["web", "secureweb"]
   */
  types: MacProxyType[];
}

export interface Authentication {
  username: string;
  password: string;
}

export interface NetworkService {
  name: string;
  enabled: boolean;
}

export interface NetworkServiceProxyStatus {
  name: string;
  enabled: boolean;
  server?: string;
  port?: number;
}

export interface DisableProxyRequest {
  networkServiceNames: string[];
  types: MacProxyType[];
}

export class MacProxied {
  private defaultNetworkServiceNames = ["Wi-Fi", "Ethernet"];
  private defaultTypes = ["web", "secureweb"] as MacProxyType[];

  listNetworkServices(): NetworkService[] {
    const context = Executor.executeSync("networksetup -listallnetworkservices");
    return context
      .split("\n")
      .filter((content) => {
        return content.trim() !== "" && content.trim() !== "An asterisk (*) denotes that a network service is disabled.";
      })
      .map((name) => {
        const disabled = name.startsWith("*");
        return {
          name: disabled ? name.substring(1).trim() : name.trim(),
          enabled: !disabled
        };
      });
  }

  async status(): Promise<NetworkServiceProxyStatus[] | null> {
    const allNetworkService = this.listNetworkServices();
    if (allNetworkService.length === 0) return null;
    return allNetworkService.map((networkService) => {
      const context = Executor.executeSync(`networksetup -get${this.defaultTypes[0]}proxy ${networkService.name}`);
      const lines = context.split("\n");
      const enabled = lines[0].startsWith("Enabled: Yes");
      if (enabled) {
        return {
          name: networkService.name,
          enabled: true,
          server: lines[1].split(":")[1].trim(),
          port: Number(lines[2].split(":")[1].trim())
        };
      } else {
        return {
          name: networkService.name,
          enabled: enabled
        };
      }
    });
  }

  enable(config: MacProxyConfig): void {
    this.verifyConfig(config);
    config.networkServiceNames.map((networkServiceName) => {
      const proxyCommand = this.generateEnableProxyCommand(networkServiceName, config);
      Executor.executeSync(proxyCommand);
    });
    // set override
    if (config.override === undefined) return;
    config.networkServiceNames.map((nenetworkServiceName) => {
      const overrideCommand = this.generateOverrideCommand(nenetworkServiceName, config.override!);
      Executor.executeSync(overrideCommand);
    });
  }

  disable(disableProxyRequest: DisableProxyRequest | undefined): void {
    if (disableProxyRequest !== undefined && disableProxyRequest.networkServiceNames.length === 0) return;
    if (disableProxyRequest === undefined) {
      // disable all
      const allNetworkService = this.listNetworkServices();
      allNetworkService.map((networkService) => {
        const proxyCommand = this.generateDisableProxyCommand(networkService.name, ["web", "secureweb", "ftp", "socksfirewall"]);
        Executor.executeSync(proxyCommand);
      });
    } else {
      disableProxyRequest.networkServiceNames.map((networkServiceName) => {
        const proxyCommand = this.generateDisableProxyCommand(networkServiceName, disableProxyRequest.types);
        Executor.executeSync(proxyCommand);
      });
    }
  }

  private verifyConfig(config: MacProxyConfig): void {
    if (!config.hostname) throw new Error("hostname is required");
    if (!config.port) throw new Error("port is required");
    if (!config.networkServiceNames) config.networkServiceNames = this.defaultNetworkServiceNames;
    if (!config.types) config.types = this.defaultTypes;
  }

  private generateEnableProxyCommand(networkServiceName: string, config: MacProxyConfig): string {
    const proxyCommand = config.types
      .map((type) => {
        if (config.authentification !== undefined) {
          return `networksetup -set${type}proxy ${networkServiceName} ${config.hostname} ${config.port} on ${config.authentification.username} ${config.authentification.password} && networksetup -set${type}proxystate ${networkServiceName} on`;
        } else {
          return `networksetup -set${type}proxy ${networkServiceName} ${config.hostname} ${config.port} off && networksetup -set${type}proxystate ${networkServiceName} on`;
        }
      })
      .join(" && ");
    return proxyCommand;
  }

  private generateDisableProxyCommand(networkServiceName: string, types: MacProxyType[]): string {
    const proxyCommand = types
      .map((type) => {
        return `networksetup -set${type}proxystate ${networkServiceName} off`;
      })
      .join(" && ");
    return proxyCommand;
  }

  private generateOverrideCommand(networkServiceName: string, override: string[]): string {
    return `networksetup -setproxybypassdomains ${networkServiceName} ${override.join(" ")}`;
  }
}
