{ pkgs, lib, config, inputs, ... }:
{
  packages = [ 
    pkgs.ruff
    pkgs.mypy
    pkgs.pre-commit
  ];

  languages.python = {
    enable = true;
    directory = "./backend/";
    poetry = {
      activate.enable=true;
      enable = true;
      install = {
        enable = true;
        groups = [ "dev" ];
      };
    };
  };

  scripts.back-up.exec = ''
    cd backend && poetry run fastapi dev games_backend/main.py --port 8000
  '';
  scripts.back-docker-build.exec = ''
    cd backend && docker build -t games-backend .
  '';
  scripts.back-docker-up.exec = ''
    cd backend && docker run -p 8000:8000 games-backend
  '';


  languages.javascript = {
    directory = "./frontend/";
    enable = true;
    npm = {
      enable = true;
    };
  };

  scripts.front-up.exec = ''
    cd frontend && npm run dev
  '';
  scripts.front-docker-build.exec = ''
    cd frontend && docker build -t games-frontend .
  '';
  scripts.front-docker-up.exec = ''
    cd frontend && docker run --env-file .env.local -p 3000:3000 games-frontend
  '';
}
