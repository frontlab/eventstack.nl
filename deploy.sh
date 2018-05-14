# Home
aws s3 cp index.html s3://eventstack.nl/index.html --content-type "text/html; charset=utf-8" --cache-control "public, must-revalidate"

# Speaker dahboard and guest RSVP
for f in fronteersconf/*.html fronteersconf/rsvp/*.html
do
	aws s3 cp "$f" "s3://eventstack.nl/${f%.*}" --content-type "text/html; charset=utf-8" --cache-control "private, must-revalidate"
done

# Static
for f in fronteersconf/vcard/* static/* static/bitmaps/* static/vectors/*
do
	if [ ! -d "$f" ]
	then
		aws s3 cp "$f" "s3://eventstack.nl/$f" --cache-control "public, must-revalidate"
	fi
done
