#!/bin/bash
# usage: step1.sh id  -> fetch notice page, notices tab? no: docs list tab. 2s spacing between requests.
W=/home/user/procurement/route3/work; UA="gaus-research-test/0.1"; id=$1
cd $W
t0=$(date +%s.%N)
curl -sS -m 40 -L -A "$UA" -c jar.txt -b jar.txt -o n_$id.html -w "$id notice HTTP %{http_code} redirects=%{num_redirects} final=%{url_effective} bytes=%{size_download}\n" "https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId=$id"
sleep 2
curl -sS -m 40 -L -A "$UA" -c jar.txt -b jar.txt -o ld_$id.html -w "$id doclist HTTP %{http_code} redirects=%{num_redirects} final=%{url_effective} bytes=%{size_download}\n" "https://viesiejipirkimai.lt/epps/cft/listContractDocuments.do?resourceId=$id"
t1=$(date +%s.%N); echo "$id elapsed $(echo "$t1-$t0"|bc)s (incl 2s sleep) requests=2"
