## Docker file to build app as container

FROM usgs/hazdev-base-images:latest-node
MAINTAINER "Eric Martinez" <emartinez@usgs.gov>
LABEL dockerfile_version="v0.1.0"


# Copy application (ignores set in .dockerignore) and set permissions
COPY . /hazdev-project
RUN chown -R hazdev-user:hazdev-user /hazdev-project

RUN yum groupinstall -y 'Development Tools' && \
    yum clean all

# Switch to hazdev-user
USER hazdev-user

# Configure application
RUN /bin/bash --login -c " \
        cd /hazdev-project && \
        export NON_INTERACTIVE=true && \
        npm install && \
        rm -rf \
            $HOME/.npm \
            /tmp/npm* \
        "


WORKDIR /hazdev-project
EXPOSE 8000
CMD [ "/hazdev-project/docker-entrypoint.sh" ]
