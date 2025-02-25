/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "seneca-stats-service",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "eu-west-2",
        },
      },
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("Vpc", { bastion: true, nat: "ec2" });
    const rds = new sst.aws.Postgres("Postgres", { vpc, proxy: true });

    new sst.x.DevCommand("Studio", {
      link: [rds],
      dev: {
        command: "npx drizzle-kit studio",
      },
    });

    new sst.aws.Function("Api", {
      vpc,
      url: true,
      link: [rds],
      handler: "src/index.handler",
    });
  },
});

