{ pkgs, lib, config, inputs, ... }:
{
  packages = [
    pkgs.pre-commit
    pkgs.docker
  ];

  scripts.back-up.exec = ''
    cd backend && go run ./cmd/server
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
  scripts.front-test.exec = ''
    cd frontend && npm run test
  '';
  scripts.front-typecheck.exec = ''
    cd frontend && npm run typecheck
  '';

  scripts.docker-build.exec = ''
    echo "Building Docker image for games-site..."
    docker build -t games-site:latest .
    echo ""
    echo "Docker image built successfully!"
    echo "Run 'docker-run' to start the container."
  '';

  scripts.docker-run.exec = ''
    echo "Starting games-site container..."
    docker run -p 8080:8080 --rm --name games-site games-site:latest
  '';

  git-hooks.hooks = {
    typos.enable = true;
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
