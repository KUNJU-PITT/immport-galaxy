#!/usr/bin/env python
from __future__ import print_function
from __future__ import division
import sys
import os
from subprocess import check_output
import numpy as np

from argparse import ArgumentParser

def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

def is_integer(s):
    try: 
        int(s)
        return True
    except ValueError:
        return False

def wc(filename):
    return int(check_output(["wc", "-l", filename]).split()[0]) - 1

def compareheaders(files):
    headers = {}
    for eachfile in files:
        with open(eachfile, "r") as ef:
            headers[eachfile] = ef.readline().strip().lower().split("\t")
 
    hdgs_in_common = []
    flag = {}
    hdgs_in_common_index = {}

    for refhdgs in headers[files[0]]:
        flag[refhdgs] = 1
        
        for ij in range(1, len(files)):
            if refhdgs in headers[files[ij]]:
                flag[refhdgs] += 1
        if flag[refhdgs] == len(files):
            hdgs_in_common.append(refhdgs)
    return(hdgs_in_common)

def getheadersindex(list_headings, headings):
    idxs = []
    lhdgs = [x.lower() for x in headings]
    for element in list_headings:
        idxs.append(int(lhdgs.index(element)))
    return(idxs)

def mergeAndDStxt(in_files, out_file, col_names, factords):
    """Concatenates together tab-separated files.
    The output will have only the columns in common to all the files provided as input, 
    as determined by the headers.
    All lines after the header line must contain only numbers.
    Potential errors are logged to stderr. If the number of errors reaches 10,
    the program stops.
    If a downsampling factor is given, returns the indicated fraction of random lines.
    """

    nb_errors = 0
    errors = {
        "numbers" : 0,
        "index" : 0        
    }
    count_lines = {}
    max_error = 10

    ## get list of headers in common to all files
    list_hdgs = compareheaders(in_files)
    
    ff_order = {}
    with open(out_file, "w") as outf:
        # If downsampling:
        wcfirstfile = wc(in_files[0])
        lines_to_keepff =[ln + 1 for ln in np.random.choice(wcfirstfile, int(wcfirstfile * factords), replace=False)]

        with open(in_files[0], "r") as firstfile:
            headingsff = firstfile.readline().strip()
            headings = headingsff.split("\t")
            count_lines[in_files[0]] = 1

            # Get index of headers in common:
            hdrs_idx = getheadersindex(list_hdgs, headings)

            # If column to merge on were provided:
            if col_names:
                for ix in col_names:
                    if not ix in hdrs_idx:
                        nb_errors += 1
                        sys.stderr.write(" ".join(["WARNING: column", str(ix), "in", in_files[0] ,
                                                   "does not exist in all files or has a different header."]) + "\n")
                        errors["index"] += 1
                hdrs_idx = col_names

            # Print out to output file:
            headings_to_write = []
            col_order = []
            cta = 0
            for cti in range(0, len(headings)):
                if cti in hdrs_idx:
                    headings_to_write.append(headings[cti])
                    ff_order[cta] = headings[cti].lower()
                    col_order.append(cti)
                    cta +=1
            outf.write("\t".join(headings_to_write) + "\n")

            # Go through file to print data to output file:
            for fileline in firstfile:
                if nb_errors < max_error:
                    fileline = fileline.strip()
                    count_lines[in_files[0]] += 1
                    if count_lines[in_files[0]] in lines_to_keepff:
                        filestuff = fileline.split("\t")
                        
                        # Check that data to write is a number:
                        to_check = [filestuff[z] for z in hdrs_idx]

                        for item in to_check:
                            if not is_number(item): 
                                nb_errors += 1
                                sys.stderr.write(" ".join(["WARNING: line", str(count_lines[in_files[0]]),
                                                           "in", in_files[0] ,"contains non-numeric results"]) + "\n")
                                errors["numbers"] += 1
 
                        # Print out:
                        if nb_errors < max_error:
                            outf.write("\t".join([filestuff[z] for z in col_order]) + "\n")
                        
        ## Go through other files:
        for i in range(1, len(in_files)):
            if nb_errors < max_error:
            
                # If downsampling:
                linenb = wc(in_files[i])
                lines_to_keep = [lin + 1 for lin in np.random.choice(linenb, int(linenb * factords), replace=False)]
                
                with open(in_files[i], "r") as inf:
                    headingsinf = inf.readline().strip().lower()
                    hdgs = headingsinf.split("\t")
                    count_lines[in_files[i]] = 1
                        
                    # Get the index of columns to keep:
                    hdgs_idx = []
                    for ctc in ff_order:
                        hdgs_idx.append(int(hdgs.index(ff_order[ctc])))
                    if col_names:
                        for iy in col_names:
                            if not iy in hdgs_idx:
                                nb_errors += 1
                                sys.stderr.write(" ".join(["WARNING: column", str(iy), "in", in_files[i],
                                                           "does not exist in all files or has a different header."]) + "\n")
                                errors["index"] += 1
                        hdgs_idx = col_names

                    # Read through file and print out to output:
                    for otherlines in inf:
                        if nb_errors < max_error:
                            count_lines[in_files[i]] += 1
                            if count_lines[in_files[i]] in lines_to_keep:
                                otherlines = otherlines.strip()
                                otherstuff = otherlines.split("\t")
                                stftowrite = [otherstuff[xy] for xy in hdgs_idx]
                                
                                for item in stftowrite:
                                    if not is_number(item):
                                        nb_errors += 1
                                        sys.stderr.write(" ".join(["WARNING: line", str(count_lines[in_files[i]]),
                                                                   "in", in_files[i] ,"contains non-numeric results"]) + "\n")
                                if nb_errors < max_error:
                                    outf.write("\t".join(stftowrite) + "\n")
 
    if nb_errors > 0:
        exit_code = 0
        if errors["numbers"] > 0:
            exit_code += 2
        if errors["index"] > 0:
            exit_code += 3
        if nb_errors == max_error:
            exit_code = 4
            sys.stderr.write("Run aborted - too many errors.")
            os.remove(out_file)
        sys.exit(exit_code)

    return

if __name__ == "__main__":
    parser = ArgumentParser(
             prog = "FCStxtmerge",
             description = "Merge based on headers text-converted FCS files into one text file.")

    parser.add_argument(
            '-i',
            dest = "input_files",
            required = True,
            action = 'append',
            help = "File location for the text files.")

    parser.add_argument(
            '-o',
            dest = "output_file",
            required = True,
            help = "Name of the output file.")

    parser.add_argument(
            '-c',
            dest = "columns",
            help = "Specify which column to keep in output file")

    parser.add_argument(
            '-d',
            dest = "downsampling_factor",
            help = "How much of each file to keep")


    args = parser.parse_args()
    
    # Get columns to merge on if any:
    defaultvaluecol = ["i.e.:1,2,5", "default", "Default"]
    columns = []
    if args.columns:
        if not args.columns in defaultvaluecol:
            tmpcol = args.columns.split(",")
            if len(tmpcol) == 1:
                if not tmpcol[0].strip():
                    columns = []
                elif not is_integer(tmpcol[0].strip()):
                    sys.exit(7)
                else:
                    columns.append(int(tmpcol[0].strip()) - 1)
            else:
                for c in range(0, len(tmpcol)):
                    if not is_integer(tmpcol[c].strip()):
                        sys.exit(6)
                    else:
                        columns.append(int(tmpcol[c].strip()) - 1)

    # Get down sampling factor if any:
    defaultvalueds = ["i.e.:0.1", "default", "Default"]
    dsfactor = 1
    if args.downsampling_factor:
        if not args.downsampling_factor in defaultvalueds:
            if is_number(args.downsampling_factor):
                dsfactor = float(args.downsampling_factor)
                if dsfactor > 1:
                    dsfactor = float(args.downsampling_factor) / 100
                if dsfactor > 100:
                    sys.exit(8)
            else:
                sys.exit(8)
    
    input_files = [f for f in args.input_files]
    mergeAndDStxt(input_files, args.output_file, columns, dsfactor)
    sys.exit(0)
