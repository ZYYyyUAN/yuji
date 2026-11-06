package com.yuji.game;
final class ByteRange {
    static long[] parse(String range,long length) {
        try {
            if(length<=0||range==null||!range.matches("bytes=\\d*-\\d*"))return null;
            String[] parts=range.substring(6).split("-",-1);
            if(parts[0].isEmpty()&&parts[1].isEmpty())return null;
            long start,end=length-1;
            if(parts[0].isEmpty()){long suffix=Long.parseLong(parts[1]);if(suffix<=0)return null;start=Math.max(0,length-suffix);}
            else {start=Long.parseLong(parts[0]);if(!parts[1].isEmpty())end=Math.min(end,Long.parseLong(parts[1]));}
            return start<0||start>end||start>=length?null:new long[]{start,end};
        }catch(Exception e){return null;}
    }
}
