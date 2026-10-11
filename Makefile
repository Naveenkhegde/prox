.PHONY: all test deb install clean

all: test deb

test:
	npm test

deb:
	./scripts/build-deb.sh

install:
	./install.sh

clean:
	rm -rf dist/
