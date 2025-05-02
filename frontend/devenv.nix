{ pkgs, lib, config, inputs, ... }:

{
  languages.javascript = {
    enable = true;
    npm = {
      enable = true;
    };
  };

  scripts.up.exec = ''
    npm run dev
  '';
  scripts.docker-build.exec = ''
    docker build -t render-frontend .
  '';
  scripts.docker-up.exec = ''
    docker run --env-file .env.local -p 3000:3000 render-frontend
  '';
}
