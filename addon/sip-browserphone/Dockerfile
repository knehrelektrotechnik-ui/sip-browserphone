FROM python:3.12-alpine

RUN apk add --no-cache jq nginx

COPY run.sh /run.sh
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY www /www

RUN chmod a+x /run.sh

EXPOSE 8099

CMD ["/run.sh"]
