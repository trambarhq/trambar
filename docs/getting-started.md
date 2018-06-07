Getting Started
---------------

Trambar Server is a [Docker](https://www.docker.com/) app. Installation and
updates are managed by a [CLI utility](https://github.com/chung-leong/trambar-cli).

* [Prerequisite](#prerequisite)
* [Installation on Linux](#installation-on-linux)
* [Installation on OSX and Windows](#installation-on-osx-and-windows)
* [Setting up server](#setting-up-server)
* [Creating first project](#creating-first-project)

## Prerequisite

For production deployment, you'll see a server connected to the Internet with a
valid domain name. Trambar Server is designed to run in the Cloud. A virtual machine
with 2G of RAM and 16G of disk space should suffice, with the latter figure dependent
on the amount of expected video contents.

You also need administrative access to a GitLab server.

For evaluation on your own computer, you should create a test instance of
GitLab CE. The easiest method is with [Docker Compose](https://docs.gitlab.com/omnibus/docker/#install-gitlab-using-docker-compose).

## Installation on Linux

1. Install **npm** if it's not a default part of the Linux distro you're using.

2. Install **trambar-cli**:

   ```sudo npm install -g trambar```

3. Start the installation process:

   ```sudo trambar install```

4. Choose whether you wish to use SSL:

   > Set up SSL? [Y/n]

   For a production server, SSL is mandatory. Certain browser features (related
   to notification and video recording) simply do not work on an unsecured page.
   You should choose yes even if you're only evaluating the software on your own
   computer.

   If you choose yes, the installation script will ask if you wish to use
   **certbot**:

   > Use certbot (https://certbot.eff.org/)? [Y/n]

   Answer yes if you do not have an SSL certificate for the server's domain name.

   If you choose no, the script will ask if you wish to use a self-signed SSL
   certificate:

   > Use self-signed SSL certificate? [Y/n]

   Answer yes if you're evaluating the software on your computer. The use of a
   "snakeoil" certificate will lead to a browser warning, but all parts of the
   web client will function correctly. Answer no if you're employing your own
   SSL certificate.

5. Enter the server's domain name:

   > Server domain name:

6. If you have chosen to use certbot, you'll be asked to provide a contact
   e-mail address:

   > Contact e-mail:

   [Let's Encrypt](https://letsencrypt.org/) will send e-mail concerning the
   SSL certificate (e.g. expiration warning) to this address.

   Otherwise, if you have not chosen the self-signed certificate, you'll be
   prompted for the location of your SSL certificate and its private key:

   > Full path of certificate:  
   > Full path of private key:

7. Choose the HTTP port for HTTP and HTTPS:

   > HTTPS port: [443]  
   > HTTP port: [80]

8. Choose a password for the root account:

   > Password for Trambar root account:

9. Wait while the installation script install Docker and retrieve Trambar's
   images from [Docker Hub](https://hub.docker.com/u/trambar/dashboard/). The
   process should take a minute or two in a Cloud-based server with
   high-bandwidth connection to the Internet.

10. Start Trambar server:

    ```sudo trambar start```

Configuration files are stored in ```/etc/trambar/```. The hidden file ```.env```
contains all parameters. ```docker-compose.yml``` contains the container
orchestration setup. It makes use of variables defined in ```.env```.
Depending on choices made during installation, certain lines will be commented
out.

```.htpasswd``` holds the root account password. The password is needed during
initial system setup. Once a GitLab server is paired with Trambar, you may
choose to delete this file and sign into the Administrative Console exclusively
through OAuth.

By default, the database is stored in ```/srv/trambar/postgres/``` while media
files are stored in ```/srv/trambar/media/```. When deploying to a cloud
server, it's advisable to mount a low-cost magnetic volume at this latter
location.

## Installation on OSX and Windows

The procedures for installing Trambar on OSX and Windows are nearly the same as
doing so on Linux. You will need to install Docker manually. You do not need to
run the CLI utility with elevated privilege (i.e. no sudo).

Configuration files will be placed in a folder called "Trambar" in your home
folder. Media files and database will reside in Docker volumes. Mapping to host
folders is not done on OSX and Windows as it's not entirely reliable.

Since Docker runs in a virtual machine on OSX and Windows, you might need to
configure port-forwarding to make the server reachable from your computer.
You might also need to increase the amount of memory available to the Docker VM.

## Setting up server

## Creating first project
