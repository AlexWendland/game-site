{ pkgs, lib, config, inputs, ... }:
{
  packages = [
    pkgs.pre-commit
    pkgs.docker
    pkgs.golangci-lint
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

  scripts.check.exec = ''
    echo "Running all git hook checks..."
    pre-commit run --all-files
  '';

  git-hooks.hooks = {
    typos.enable = true;

    # Frontend hooks
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

    # Go backend hooks
    golangci-lint = {
      enable = true;
      name = "golangci-lint";
      entry = "bash -c 'cd backend && golangci-lint run --fix'";
      pass_filenames = false;
      always_run = true;
    };
    gotest = {
      enable = true;
      name = "go test";
      entry = "bash -c 'cd backend && go test ./...'";
      pass_filenames = false;
      always_run = true;
    };
  };
}
