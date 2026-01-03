#!/bin/bash

rm -rf /Users/karl/prices-app/build/node_modules/@autolib/auto
rm -rf /Users/karl/prices-app/src/node_modules/@autolib/auto

ln -s /Users/karl/autojs/kernels/blocks /Users/karl/prices-app/build/node_modules/@autolib/auto
ln -s /Users/karl/autojs/kernels/blocks /Users/karl/prices-app/src/node_modules/@autolib/auto