# ipfs-zenko

Our project was to create a cloud-based data storage platform using the IPFS and integrate it into the Zenko stack.

The IPFS (InterPlanetary File System) is a distributed file system that relies on peers to store files and upload them to the network. It’s decentralized, version controlled and duplicate file protected, with a possibility of saving almost 60% in bandwidth costs. When you add a file to the IPFS, the file and all its individual blocks are hashed using base58-btc encoding and indexed on the network. When you want to access your file, the network searches the nodes it’s interested in in order to quickly produce data. 

Due to the nature of IPFS where data is immutable and persistent, it would be a benefit to the security of your files. No one will be able to lock you out of your data. In light of the recent ransomware attacks, this is an extremely important tool to have at your disposal.

In regards to integration with blockchain, you can also address large amounts of data with IPFS, and place the immutable, permanent IPFS links into a blockchain transaction. This timestamps and secures your content, without having to put the data on the chain itself.
It’s like blockchain meets bitTorrent for data storage.

## Goals

When we started this project, we had never worked with the Zenko stack nor familiar with the IPFS network. Thanks to the well written documentation on both technologies, we were able to learn the inner workings of the full Zenko stack so that we could properly integrate IPFS into the scality S3 backend.

This meant replacing the data and metadata modules with one module that interfaces with IPFS. Fortunately, the framework was flexible enough to allow us to manage the data into IPFS services.

Using the zenko framework and the ipfs module you can push data onto the local ipfs node which when pulled from an external gateway is shared in all the neighboring nodes and across the network. In our case, the metadata is stored in a json file and put back into the ipfs network and everytime there is an update, a new record is created and pushed onto the network.

![diagram](https://github.com/jeftekhari/ipfs-zenko/blob/master/presentation/Diagram.png "Data Flow Diagram")

## Instructions

Clone the Repo:

`git clone https://github.com/ssalaues/zenko-ipfs-module`

Make sure you choose a node to be assigned persistent containers.

`$ docker node update --label-add io.zenko.type=storage <id of chosen node>`

Persistent Volumes

![volumes](https://raw.githubusercontent.com/jeftekhari/ipfs-zenko/master/presentation/Volumes.png "Persistent Volumes")

To make sure your data is accessible in the future, please add these two directories to your local machine.

`mkdir /tmp/ipfs_staging` and `mkdir /tmp/ipfs_data`

Then type:

`docker stack deploy -c docker-stack.yml zenko-ipfs-prod`
 
This will deploy the version of the Zenko stack that includes our IPFS service.
The IPFS daemon will initialize and your S3 server will start.

You can type: `docker service ls` to view active services.

Now it's time to make a bucket!

Type: `aws s3 --endpoint http://localhost:8000 mb s3://<custom_bucket_name> --region=us-east-1` to create a bucket.
It should return a message that confirms your creation.

You can check the contets of your bucket by changing the `mb` (make bucket) to `ls`.
EXAMPLE:
`aws s3 --endpoint http://localhost:8000 ls s3://<custom_bucket_name> --region=us-east-1`

To upload a file to your bucket, use the `cp` commmand with the intended file directly after.
`aws s3 --endpoint http://localhost:8000 cp <intended_file.txt> s3://<custom_bucket_name> --region=us-east-1`

Awesome! You've created a bucket, uploaded a file and peeked inside your bucket.

Here's the Docker image link, just in case.
https://hub.docker.com/r/hanuprateek/zenko-ipfs-module/
