module.exports = {
  apps: [
    {
      name: "teamcrazy-backend",
      cwd: "/var/www/teamcrazy-hub/backend",
      script: "venv/bin/uvicorn",
      args: "server:app --host 127.0.0.1 --port 8001 --workers 2",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PYTHONUNBUFFERED: "1",
      },
      max_memory_restart: "500M",
      autorestart: true,
      watch: false,
      error_file: "/var/log/teamcrazy/backend-error.log",
      out_file: "/var/log/teamcrazy/backend-out.log",
      time: true,
    },
  ],
};
