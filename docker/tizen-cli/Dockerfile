# Tizen CLI build image for CleanTV: packages and signs the widget without WSL or a
# local Tizen Studio CLI. Certificates are never copied in: the owner's profile folder
# (author/distributor .p12 + .pwd) is mounted read-only at /certs at run time.
#
#   docker build -t cleantv-tizen-cli docker/tizen-cli
#   (normally driven by: npm run tv:setup -- --builder docker)
FROM ubuntu:24.04

ARG TIZEN_CLI_URL=https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_ubuntu-64.bin

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl python3 zip unzip libncurses6 libpython3.12 gettext-base \
 && rm -rf /var/lib/apt/lists/*

# The Tizen installer refuses to run as root.
RUN useradd -m -s /bin/bash tizen
USER tizen
RUN curl -fsSL "$TIZEN_CLI_URL" -o /tmp/cli.bin \
 && chmod +x /tmp/cli.bin \
 && /tmp/cli.bin --accept-license /home/tizen/tizen-studio \
 && rm -f /tmp/cli.bin \
 && test -x /home/tizen/tizen-studio/tools/ide/bin/tizen

ENV TIZEN_SDK=/home/tizen/tizen-studio
ENV PATH=/home/tizen/tizen-studio/tools:/home/tizen/tizen-studio/tools/ide/bin:$PATH
COPY --chmod=755 entrypoint.sh /usr/local/bin/cleantv-entrypoint
WORKDIR /work
ENTRYPOINT ["cleantv-entrypoint"]
CMD ["python3", "scripts/package.py"]
