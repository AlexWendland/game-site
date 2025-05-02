{ pkgs, lib, config, inputs, ... }:
{
  packages = [ 
    pkgs.ruff
    pkgs.mypy
  ];
  languages.python = {
    enable = true;
    poetry = {
      activate.enable=true;
      enable = true;
      install = {
        enable = true;
        groups = [ "dev" ];
      };
    };
  };

  scripts.up.exec = ''
    poetry run fastapi dev render_backend/main.py --port 8000
  '';
  scripts.docker-build.exec = ''
    docker build -t render-backend .
  '';
  scripts.docker-up.exec = ''
    docker run -p 8000:10000 render-backend
  '';
}
