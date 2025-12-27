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

  languages.go = {
    enable = true;
  };

  languages.javascript = {
    directory = "./frontend/";
    enable = true;
    npm = {
      enable = true;
      install.enable = true;
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
  scripts.front-test.exec = ''
    cd frontend && npm run test
  '';
  scripts.front-test-watch.exec = ''
    cd frontend && npm run test:watch
  '';
  scripts.front-typecheck.exec = ''
    cd frontend && npm run typecheck
  '';

  git-hooks.hooks = {
    ruff.enable = true;
    ruff-format.enable = true;
    typos.enable = true;
    pytest = {
      enable = true;
      name = "Pytest";
      entry = "bash -c 'devenv shell && cd backend && poetry run pytest'";
      pass_filenames = false;
      args = [ "--maxfail=1" "--disable-warnings" "--tb=short" ];
      always_run = true;
    };
    jest = {
      enable = true;
      name = "Jest";
      entry = "bash -c 'devenv shell && cd frontend && npm run test'";
      pass_filenames = false;
      args = [ "--watchAll=false" ];
      always_run = true;
    };
    typescript = {
      enable = true;
      name = "TypeScript";
      entry = "bash -c 'devenv shell && cd frontend && npm run typecheck'";
      pass_filenames = false;
      always_run = true;
    };
  };
}
